import os

# Broker and backend connection strings using Redis
broker_url = os.getenv("REDIS_URL", "redis://redis:6379/0")
result_backend = os.getenv("REDIS_URL", "redis://redis:6379/0")

# Serializer settings (enforcing JSON as requested to avoid pickle security issues)
task_serializer = "json"
result_serializer = "json"
accept_content = ["json"]

# Timezone configurations
timezone = "UTC"
enable_utc = True

# Task imports - tells Celery to load and register these task routes at startup
imports = (
    "app.application.tasks",
)
