#!/bin/bash
set -e

echo "🚀 Share Notes - Setup Script"
echo "=============================="

# Check if running from root directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the root directory"
    exit 1
fi

echo ""
echo "📦 Installing root dependencies..."
npm install

echo ""
echo "📦 Installing frontend dependencies..."
cd frontend
npm install
cd ..

echo ""
echo "📦 Installing backend dependencies..."
cd backend

# Check if Poetry is installed
if ! command -v poetry &> /dev/null; then
    echo "📥 Poetry not found. Installing Poetry..."
    curl -sSL https://install.python-poetry.org | python3 -
    export PATH="$HOME/.local/bin:$PATH"
fi

# Configure Poetry to use Python 3.12
poetry env use python3.12

poetry install
cd ..

echo ""
echo "📄 Creating environment files..."

# Frontend .env
if [ ! -f "frontend/.env" ]; then
    echo "Creating frontend/.env from .env.example"
    cp frontend/.env.example frontend/.env
else
    echo "frontend/.env already exists, skipping"
fi

# Backend .env
if [ ! -f "backend/.env" ]; then
    echo "Creating backend/.env from .env.example"
    cp backend/.env.example backend/.env
else
    echo "backend/.env already exists, skipping"
fi

echo ""
echo "🎣 Setting up Husky hooks..."
npm run prepare

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update .env files with your configuration"
echo "2. Start development: docker-compose up -d"
echo "3. Or run services individually:"
echo "   - Frontend: npm run frontend:dev"
echo "   - Backend: npm run backend:dev"
echo ""
echo "📚 For more information:"
echo "   - README.md - Main documentation"
echo "   - QUICKSTART.md - Quick start guide"
echo "   - MIGRATION_GUIDE.md - Tech stack migration details"
echo "   - DEVELOPMENT.md - Development workflow"
