## 🛠 Setup & Run Instructions

1. **Clone / copy the project folder**
   Make sure `app.py` (your Flask code) and `requirements.txt` are in the same folder.

2. **Create and activate a virtual environment**

   ```bash
   # create venv
   python3 -m venv venv

   # activate (Linux / macOS)
   source venv/bin/activate

   # activate (Windows PowerShell)
   venv\Scripts\Activate
   ```

3. **Install dependencies**

   ```bash
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

4. **Run the server**

   ```bash
   python app.py
   ```

   You should see something like:

   ```
   * Running on http://0.0.0.0:8001
   ```

5. **Open Swagger UI**
   In your browser go to:
   👉 [http://localhost:8001/apidocs](http://localhost:8001/apidocs)

   - Use `/health` to check service.
   - Use `/predict` → upload a waste image → get JSON contamination score.

---
