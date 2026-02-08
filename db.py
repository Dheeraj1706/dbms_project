import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

def get_connection():
    """
    Establishes connection to PostgreSQL database.
    Automatically handles SSL for cloud databases (like Supabase) 
    and disables SSL for local databases.
    """
    # Check if using cloud database (Supabase, AWS RDS, etc.)
    # Local databases typically use 'localhost' or '127.0.0.1'
    host = os.getenv("DB_HOST", "localhost")
    is_local = host in ["localhost", "127.0.0.1"]
    
    connection_params = {
        "host": host,
        "database": os.getenv("DB_NAME"),
        "user": os.getenv("DB_USER"),
        "password": os.getenv("DB_PASSWORD"),
        "port": os.getenv("DB_PORT", "5432"),
    }
    
    # Only require SSL for cloud databases
    if not is_local:
        connection_params["sslmode"] = "require"
    else:
        connection_params["sslmode"] = "disable"
    
    return psycopg2.connect(**connection_params)


