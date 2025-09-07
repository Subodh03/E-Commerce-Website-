from flask import Blueprint, request, jsonify, render_template, redirect, url_for, flash, session
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, verify_jwt_in_request
from werkzeug.security import check_password_hash
from models import User, Item, CartItem
from extensions import db
import logging

main_bp = Blueprint('main', __name__)
api_bp = Blueprint('api', __name__)

# Helper function to check if user is logged in
def is_logged_in():
    try:
        verify_jwt_in_request(optional=True)
        return get_jwt_identity() is not None
    except:
        return False

# Main routes (HTML pages)
@main_bp.route('/')
def index():
    return render_template('index.html', logged_in=is_logged_in())

@main_bp.route('/login')
def login():
    if is_logged_in():
        return redirect(url_for('main.items'))
    return render_template('login.html')

@main_bp.route('/signup')
def signup():
    if is_logged_in():
        return redirect(url_for('main.items'))
    return render_template('signup.html')

@main_bp.route('/items')
def items():
    return render_template('items.html', logged_in=is_logged_in())

@main_bp.route('/cart')
def cart():
    return render_template('cart.html', logged_in=is_logged_in())

# API Routes
@api_bp.route('/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        
        if not data or not data.get('username') or not data.get('email') or not data.get('password'):
            return jsonify({'error': 'Missing required fields'}), 400
        
        # Check if user already exists
        if User.query.filter_by(username=data['username']).first():
            return jsonify({'error': 'Username already exists'}), 400
        
        if User.query.filter_by(email=data['email']).first():
            return jsonify({'error': 'Email already exists'}), 400
        
        # Create new user
        user = User()
        user.username = data['username']
        user.email = data['email']
        user.set_password(data['password'])
        
        db.session.add(user)
        db.session.commit()
        
        # Create access token
        access_token = create_access_token(identity=str(user.id))
        
        return jsonify({
            'message': 'User created successfully',
            'access_token': access_token,
            'user': user.to_dict()
        }), 201
        
    except Exception as e:
        logging.error(f"Registration error: {str(e)}")
        return jsonify({'error': 'Registration failed'}), 500

@api_bp.route('/login', methods=['POST'])
def api_login():
    try:
        data = request.get_json()
        
        if not data or not data.get('username') or not data.get('password'):
            return jsonify({'error': 'Missing username or password'}), 400
        
        user = User.query.filter_by(username=data['username']).first()
        
        if user and user.check_password(data['password']):
            access_token = create_access_token(identity=str(user.id))
            return jsonify({
                'access_token': access_token,
                'user': user.to_dict()
            }), 200
        
        return jsonify({'error': 'Invalid credentials'}), 401
        
    except Exception as e:
        logging.error(f"Login error: {str(e)}")
        return jsonify({'error': 'Login failed'}), 500

@api_bp.route('/items', methods=['GET'])
def get_items():
    try:
        # Get query parameters for filtering
        category = request.args.get('category')
        min_price = request.args.get('min_price', type=float)
        max_price = request.args.get('max_price', type=float)
        search = request.args.get('search')
        
        # Build query
        query = Item.query
        
        if category:
            query = query.filter(Item.category == category)
        
        if min_price is not None:
            query = query.filter(Item.price >= min_price)
            
        if max_price is not None:
            query = query.filter(Item.price <= max_price)
            
        if search:
            query = query.filter(Item.name.contains(search) | Item.description.contains(search))
        
        items = query.all()
        return jsonify([item.to_dict() for item in items])
        
    except Exception as e:
        logging.error(f"Get items error: {str(e)}")
        return jsonify({'error': 'Failed to fetch items'}), 500

@api_bp.route('/categories', methods=['GET'])
def get_categories():
    try:
        categories = db.session.query(Item.category).distinct().all()
        return jsonify([category[0] for category in categories])
    except Exception as e:
        logging.error(f"Get categories error: {str(e)}")
        return jsonify({'error': 'Failed to fetch categories'}), 500

@api_bp.route('/cart', methods=['GET'])
@jwt_required()
def get_cart():
    try:
        user_id = int(get_jwt_identity())
        cart_items = CartItem.query.filter_by(user_id=user_id).all()
        
        total = sum(item.item.price * item.quantity for item in cart_items)
        
        return jsonify({
            'items': [item.to_dict() for item in cart_items],
            'total': total,
            'count': len(cart_items)
        })
        
    except Exception as e:
        logging.error(f"Get cart error: {str(e)}")
        return jsonify({'error': 'Failed to fetch cart'}), 500

@api_bp.route('/cart', methods=['POST'])
@jwt_required()
def add_to_cart():
    try:
        user_id = int(get_jwt_identity())
        data = request.get_json()
        
        if not data or not data.get('item_id'):
            return jsonify({'error': 'Missing item_id'}), 400
        
        item = Item.query.get(data['item_id'])
        if not item:
            return jsonify({'error': 'Item not found'}), 404
        
        quantity = data.get('quantity', 1)
        
        # Check if item already in cart
        cart_item = CartItem.query.filter_by(user_id=user_id, item_id=data['item_id']).first()
        
        if cart_item:
            cart_item.quantity += quantity
        else:
            cart_item = CartItem()
            cart_item.user_id = user_id
            cart_item.item_id = data['item_id']
            cart_item.quantity = quantity
            db.session.add(cart_item)
        
        db.session.commit()
        
        return jsonify({
            'message': 'Item added to cart',
            'cart_item': cart_item.to_dict()
        }), 201
        
    except Exception as e:
        logging.error(f"Add to cart error: {str(e)}")
        return jsonify({'error': 'Failed to add item to cart'}), 500

@api_bp.route('/cart/<int:cart_item_id>', methods=['PUT'])
@jwt_required()
def update_cart_item(cart_item_id):
    try:
        user_id = int(get_jwt_identity())
        data = request.get_json()
        
        cart_item = CartItem.query.filter_by(id=cart_item_id, user_id=user_id).first()
        if not cart_item:
            return jsonify({'error': 'Cart item not found'}), 404
        
        if 'quantity' in data:
            if data['quantity'] <= 0:
                db.session.delete(cart_item)
            else:
                cart_item.quantity = data['quantity']
        
        db.session.commit()
        
        return jsonify({
            'message': 'Cart updated',
            'cart_item': cart_item.to_dict() if cart_item.quantity > 0 else None
        })
        
    except Exception as e:
        logging.error(f"Update cart error: {str(e)}")
        return jsonify({'error': 'Failed to update cart'}), 500

@api_bp.route('/cart/<int:cart_item_id>', methods=['DELETE'])
@jwt_required()
def remove_from_cart(cart_item_id):
    try:
        user_id = int(get_jwt_identity())
        
        cart_item = CartItem.query.filter_by(id=cart_item_id, user_id=user_id).first()
        if not cart_item:
            return jsonify({'error': 'Cart item not found'}), 404
        
        db.session.delete(cart_item)
        db.session.commit()
        
        return jsonify({'message': 'Item removed from cart'})
        
    except Exception as e:
        logging.error(f"Remove from cart error: {str(e)}")
        return jsonify({'error': 'Failed to remove item from cart'}), 500
