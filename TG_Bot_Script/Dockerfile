FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .

# Install dependencies (including job-queue extra)
RUN pip install --no-cache-dir -r requirements.txt \
    && pip install --no-cache-dir "python-telegram-bot[job-queue]"

COPY . .

CMD ["python", "TG_Automation_Enhanced.py"]