@echo off
echo.
echo  #########################################################
echo  #       BIBLIOTHECA - AUTOMATED PROJECT SETUP         #
echo  #########################################################
echo.

:: 1. Backend Setup
echo [1/3] Setting up Backend...
cd Backend
if not exist venv (
    echo Creating Python virtual environment...
    python -m venv venv
)
call venv\Scripts\activate
echo Installing Backend dependencies...
pip install -r requirements.txt
if not exist .env (
    echo Creating .env file from example...
    copy .env.example .env
    echo PLEASE UPDATE THE .env FILE WITH YOUR MYSQL PASSWORD!
)
cd ..

:: 2. Frontend Setup
echo.
echo [2/3] Setting up Frontend...
cd frontend
echo Installing Frontend dependencies...
call npm install
cd ..

echo.
echo [3/3] Setup complete!
echo.
echo To start the project:
echo 1. Run the Backend: cd Backend ^& venv\Scripts\python app.py
echo 2. Run the Frontend: cd frontend ^& npm start
echo.
pause
