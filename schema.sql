-- =====================================================
-- Online Course Management Platform (MOOC)
-- Database Schema for Supabase
-- =====================================================

-- =====================================================
-- ENABLE EXTENSION
-- =====================================================
create extension if not exists "pgcrypto";

-- =====================================================
-- USERS PROFILE TABLE
-- =====================================================
create table public.users (
    user_id uuid primary key references auth.users(id) on delete cascade,
    name text not null,
    email text unique not null,
    role text check (
        role in ('student','instructor','administrator','data_analyst')
    ) not null,
    approved boolean default false,
    created_at timestamp default now()
);

-- =====================================================
-- STUDENT
-- =====================================================
create table public.student (
    user_id uuid primary key references public.users(user_id) on delete cascade,
    branch text,
    country text,
    dob date,
    phone_number text,
    total_courses_enrolled int default 0,
    total_courses_completed int default 0
);

-- =====================================================
-- INSTRUCTOR
-- =====================================================
create table public.instructor (
    user_id uuid primary key references public.users(user_id) on delete cascade,
    branch text,
    specialization text,
    hire_year int,
    phone_number text,
    total_courses int default 0
);

-- =====================================================
-- UNIVERSITY
-- =====================================================
create table public.university (
    university_id uuid primary key default gen_random_uuid(),
    name text not null,
    country text,
    ranking int,
    website text
);

-- =====================================================
-- COURSE
-- =====================================================
create table public.course (
    course_id uuid primary key default gen_random_uuid(),
    title text not null,
    fees numeric,
    duration text,
    level text,
    description text,
    total_enrollments int default 0,
    total_vacancies int,
    program text,
    university_id uuid references public.university(university_id)
);

-- =====================================================
-- TEACHES RELATION
-- =====================================================
create table public.teaches (
    instructor_id uuid references public.instructor(user_id) on delete cascade,
    course_id uuid references public.course(course_id) on delete cascade,
    primary key (instructor_id, course_id)
);

-- =====================================================
-- ENROLLMENT
-- =====================================================
create table public.enrolled_in (
    user_id uuid references public.student(user_id) on delete cascade,
    course_id uuid references public.course(course_id) on delete cascade,
    enroll_date date default current_date,
    status text check (
        status in ('ongoing','completed','dropped')
    ),
    grade text,
    completion_date date,
    primary key (user_id, course_id)
);

-- =====================================================
-- MODULE
-- =====================================================
create table public.module (
    course_id uuid references public.course(course_id) on delete cascade,
    module_number int,
    duration text,
    name text,
    primary key (course_id,module_number)
);

-- =====================================================
-- MODULE CONTENT
-- =====================================================
create table public.module_content (
    content_id uuid primary key default gen_random_uuid(),
    course_id uuid,
    module_number int,
    title text,
    type text,
    url text,
    foreign key (course_id,module_number)
    references public.module(course_id,module_number)
    on delete cascade
);

-- =====================================================
-- COURSE INSIGHT (Analyst-posted insights for students)
-- =====================================================
create table if not exists public.course_insight (
    insight_id uuid primary key default gen_random_uuid(),
    course_id uuid references public.course(course_id) on delete cascade not null,
    posted_by uuid references public.users(user_id) on delete set null,
    title text not null,
    chart_type text not null,
    chart_data jsonb,
    summary text,
    created_at timestamp default now()
);

create index if not exists idx_course_insight_course on public.course_insight(course_id);

-- =====================================================
-- AUTO USER PROFILE CREATION
-- =====================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users(user_id,email,name,role)
  values(
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name','New User'),
    'student'
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- =====================================================
-- ENABLE RLS
-- =====================================================
alter table public.users enable row level security;
alter table public.student enable row level security;
alter table public.instructor enable row level security;
alter table public.enrolled_in enable row level security;
alter table public.teaches enable row level security;
alter table public.module enable row level security;
alter table public.module_content enable row level security;
alter table public.course enable row level security;
alter table public.university enable row level security;

-- =====================================================
-- USER POLICIES
-- =====================================================
create policy "Users view own profile"
on public.users
for select
using (auth.uid() = user_id);

create policy "Users update own profile"
on public.users
for update
using (auth.uid() = user_id);

create policy "Admin read all users"
on public.users
for select
using (
    exists (
        select 1 from public.users u
        where u.user_id = auth.uid()
        and u.role = 'administrator'
    )
);

-- =====================================================
-- STUDENT POLICIES
-- =====================================================
create policy "Student manage own record"
on public.student
for all
using (auth.uid() = user_id);

create policy "Admin manage students"
on public.student
for all
using (
    exists (
        select 1 from public.users
        where user_id = auth.uid()
        and role = 'administrator'
    )
);

-- =====================================================
-- INSTRUCTOR POLICIES
-- =====================================================
create policy "Instructor manage own record"
on public.instructor
for all
using (auth.uid() = user_id);

-- =====================================================
-- ENROLLMENT POLICIES
-- =====================================================
create policy "Student manage own enrollment"
on public.enrolled_in
for all
using (auth.uid() = user_id);

-- =====================================================
-- PUBLIC READ COURSES & UNIVERSITIES
-- =====================================================
create policy "Public read courses"
on public.course
for select using (true);

create policy "Public read universities"
on public.university
for select using (true);

-- =====================================================
-- ADMIN ASSIGN INSTRUCTORS
-- =====================================================
create policy "Admin assign instructors"
on public.teaches
for insert
with check (
    exists (
        select 1 from public.users
        where user_id = auth.uid()
        and role = 'administrator'
    )
);

-- =====================================================
-- INSTRUCTOR ADD CONTENT
-- =====================================================
create policy "Instructor add module content"
on public.module_content
for insert
with check (
    exists (
        select 1 from public.teaches
        where instructor_id = auth.uid()
        and teaches.course_id = module_content.course_id
    )
);

-- =====================================================
-- INDEXES (for better query performance)
-- =====================================================
create index if not exists idx_users_email on public.users(email);
create index if not exists idx_users_role on public.users(role);
create index if not exists idx_enrolled_user on public.enrolled_in(user_id);
create index if not exists idx_enrolled_course on public.enrolled_in(course_id);
create index if not exists idx_enrolled_status on public.enrolled_in(status);
create index if not exists idx_teaches_instructor on public.teaches(instructor_id);
create index if not exists idx_teaches_course on public.teaches(course_id);
create index if not exists idx_course_university on public.course(university_id);

-- =====================================================
-- TRIGGERS (for automatic updates)
-- =====================================================

-- Trigger: Update student's total_courses_enrolled when enrollment happens
create or replace function update_student_enrollment_count()
returns trigger as $$
begin
    update public.student
    set total_courses_enrolled = (
        select count(*) 
        from public.enrolled_in 
        where user_id = new.user_id and status != 'dropped'
    )
    where user_id = new.user_id;
    return new;
end;
$$ language plpgsql;

drop trigger if exists trigger_update_enrollment_count on public.enrolled_in;

create trigger trigger_update_enrollment_count
after insert or update or delete on public.enrolled_in
for each row
execute function update_student_enrollment_count();

-- Trigger: Update student's total_courses_completed when status changes to 'completed'
create or replace function update_student_completion_count()
returns trigger as $$
begin
    if new.status = 'completed' and (old.status is null or old.status != 'completed') then
        update public.student
        set total_courses_completed = (
            select count(*) 
            from public.enrolled_in 
            where user_id = new.user_id and status = 'completed'
        )
        where user_id = new.user_id;
    end if;
    return new;
end;
$$ language plpgsql;

drop trigger if exists trigger_update_completion_count on public.enrolled_in;

create trigger trigger_update_completion_count
after update on public.enrolled_in
for each row
execute function update_student_completion_count();

-- Trigger: Update instructor's total_courses when assigned to course
create or replace function update_instructor_course_count()
returns trigger as $$
begin
    update public.instructor
    set total_courses = (
        select count(*) 
        from public.teaches 
        where instructor_id = new.instructor_id
    )
    where user_id = new.instructor_id;
    return new;
end;
$$ language plpgsql;

drop trigger if exists trigger_update_instructor_count on public.teaches;

create trigger trigger_update_instructor_count
after insert or delete on public.teaches
for each row
execute function update_instructor_course_count();

-- Trigger: Update course total_enrollments
create or replace function update_course_enrollment_count()
returns trigger as $$
begin
    update public.course
    set total_enrollments = (
        select count(*) 
        from public.enrolled_in 
        where course_id = new.course_id and status != 'dropped'
    )
    where course_id = new.course_id;
    return new;
end;
$$ language plpgsql;

drop trigger if exists trigger_update_course_enrollment_count on public.enrolled_in;

create trigger trigger_update_course_enrollment_count
after insert or update or delete on public.enrolled_in
for each row
execute function update_course_enrollment_count();
