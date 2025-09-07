import os
import logging
from flask import Flask
from flask_cors import CORS
from extensions import db, jwt


logging.basicConfig(level=logging.DEBUG)

def create_app():
    app = Flask(__name__)
    
    
    app.config['SECRET_KEY'] = os.environ.get('SESSION_SECRET', 'dev-secret-key')
    database_url = os.environ.get('DATABASE_URL', 'sqlite:///ecommerce.db')
    app.config['SQLALCHEMY_DATABASE_URI'] = database_url
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    
    if database_url.startswith('postgresql://') or database_url.startswith('postgres://'):
        # PostgreSQL configuration
        app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
            "pool_pre_ping": True,
            "pool_recycle": 300,
            "connect_args": {"sslmode": "require", "connect_timeout": 10}
        }
    else:
        # SQLite configuration (for local development)
        app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
            "pool_pre_ping": True,
            "pool_recycle": 300
        }
    
    app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'jwt-secret-string')
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = False  # Tokens don't expire for simplicity
    
    
    db.init_app(app)
    jwt.init_app(app)
    CORS(app)
    
    
    from routes import main_bp, api_bp
    app.register_blueprint(main_bp)
    app.register_blueprint(api_bp, url_prefix='/api')
    
    
    with app.app_context():
        import models
        db.create_all()
        
        
        if models.Item.query.count() == 0:
            sample_items = [
                {'name': 'Laptop', 'description': 'High-performance laptop', 'price': 999.99, 'category': 'Electronics', 'stock': 10},
                {'name': 'Smartphone', 'description': 'Latest smartphone', 'price': 699.99, 'category': 'Electronics', 'stock': 15},
                {'name': 'Coffee Mug', 'description': 'Premium ceramic mug', 'price': 19.99, 'category': 'Home', 'stock': 25},
                {'name': 'Book', 'description': 'Best-selling novel', 'price': 14.99, 'category': 'Books', 'stock': 30},
                {'name': 'Headphones', 'description': 'Wireless headphones', 'price': 149.99, 'category': 'Electronics', 'stock': 20},
                {'name': 'T-Shirt', 'description': 'Cotton t-shirt', 'price': 24.99, 'category': 'Clothing', 'stock': 40},
            ]
            for item_data in sample_items:
                item = models.Item()
                item.name = item_data['name']
                item.description = item_data['description']
                item.price = item_data['price']
                item.category = item_data['category']
                item.stock = item_data['stock']
                db.session.add(item)
            db.session.commit()
    
    return app

