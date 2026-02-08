async function loadUsers(){

    const res = await fetch("/admin/users");
    const data = await res.json();

    const list = document.getElementById("userList");

    list.innerHTML = "<h3>All Users</h3>";

    data.users.forEach(user => {

        list.innerHTML += `
        <p>
            ${user[1]} (${user[3]})
            <button onclick="deleteStudent('${user[0]}')">Delete</button>
        </p>
        `;
    });
}

async function deleteStudent(id){

    await fetch(`/admin/delete_student/${id}`);

    alert("Student Deleted");

    loadUsers();
}

async function assignInstructor(){

    const instructor = document.getElementById("instructorId").value;
    const course = document.getElementById("courseId").value;

    await fetch("/admin/assign", {
        method:"POST",
        headers:{ "Content-Type":"application/x-www-form-urlencoded" },
        body:`instructor_id=${instructor}&course_id=${course}`
    });

    alert("Instructor Assigned");
}

async function addStudent(){

    const name = document.getElementById("studentName").value;
    const email = document.getElementById("studentEmail").value;

    await fetch("/admin/add_student", {
        method:"POST",
        headers:{ "Content-Type":"application/x-www-form-urlencoded" },
        body:`name=${name}&email=${email}`
    });

    alert("Student Added!");
}



async function loadCourses(){

    const res = await fetch("/admin/courses");
    const data = await res.json();

    const list = document.getElementById("courseList");

    list.innerHTML = "<h3>Courses</h3>";

    data.courses.forEach(course => {

        list.innerHTML += `
            <p>
                ${course[1]} (${course[2]}) - ${course[3]}
            </p>
        `;
    });
}
