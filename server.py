from flask import Flask, jsonify, request, render_template, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from datetime import datetime
import os

app = Flask(__name__, static_folder='static', template_folder='templates')
CORS(app)

# SQLite database
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
db_path = os.path.join(BASE_DIR, 'hostel.db')
app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{db_path}"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)


#  DB Model

class Student(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(160), nullable=False)
    email = db.Column(db.String(160))
    phone = db.Column(db.String(50))

    bookings = db.relationship('Booking', backref='student', cascade="all, delete-orphan")

    def to_dict(self):
        return {"id": self.id, "name": self.name, "email": self.email, "phone": self.phone}


class Room(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    number = db.Column(db.String(50), nullable=False)
    type = db.Column(db.String(50), default="Single")
    price = db.Column(db.Integer, default=0)
    capacity = db.Column(db.Integer, default=1)
    available = db.Column(db.Boolean, default=True)

    bookings = db.relationship('Booking', backref='room', cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "number": self.number,
            "type": self.type,
            "price": self.price,
            "capacity": self.capacity,
            "available": self.available,
        }


class Booking(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('student.id'), nullable=False)
    room_id = db.Column(db.Integer, db.ForeignKey('room.id'), nullable=False)
    from_date = db.Column(db.String(50))
    to_date = db.Column(db.String(50))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    payments = db.relationship('Payment', backref='booking', cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "student_id": self.student_id,
            "room_id": self.room_id,
            "from": self.from_date,
            "to": self.to_date,
            "created_at": self.created_at.isoformat(),
        }


class Payment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    booking_id = db.Column(db.Integer, db.ForeignKey('booking.id'), nullable=False)
    amount = db.Column(db.Integer, nullable=False)
    date = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "booking_id": self.booking_id,
            "amount": self.amount,
            "date": self.date.isoformat(),
        }



# Initialize DB 
def init_db():
    db.create_all()
    if Student.query.count() == 0:
        s1 = Student(name="Amit Kumar", email="amit@example.com", phone="9876543210")
        s2 = Student(name="Neha Sharma", email="neha@example.com", phone="9123456780")
        db.session.add_all([s1, s2])
    if Room.query.count() == 0:
        r1 = Room(number="101", type="Single", price=5000, capacity=1, available=True)
        r2 = Room(number="102", type="Double", price=8000, capacity=2, available=True)
        db.session.add_all([r1, r2])
    db.session.commit()



# frontend routes

@app.route('/')
def index():
    return render_template('index.html')


@app.route('/static/<path:path>')
def send_static(path):
    return send_from_directory('static', path)



# API routes


# Students
@app.route('/api/students', methods=['GET'])
def list_students():
    students = Student.query.order_by(Student.id.desc()).all()
    return jsonify([s.to_dict() for s in students])


@app.route('/api/students', methods=['POST'])
def create_student():
    data = request.json or {}
    if not data.get('name'):
        return jsonify({"error": "name is required"}), 400
    s = Student(name=data.get('name'), email=data.get('email'), phone=data.get('phone'))
    db.session.add(s)
    db.session.commit()
    return jsonify(s.to_dict()), 201


@app.route('/api/students/<int:student_id>', methods=['DELETE'])
def delete_student(student_id):
    s = Student.query.get_or_404(student_id)
    db.session.delete(s)
    db.session.commit()
    return jsonify({"deleted": True})


# Rooms
@app.route('/api/rooms', methods=['GET'])
def list_rooms():
    rooms = Room.query.order_by(Room.id.desc()).all()
    return jsonify([r.to_dict() for r in rooms])


@app.route('/api/rooms', methods=['POST'])
def create_room():
    data = request.json or {}
    if not data.get('number'):
        return jsonify({"error": "room number required"}), 400
    r = Room(
        number=data.get('number'),
        type=data.get('type', 'Single'),
        price=int(data.get('price') or 0),
        capacity=int(data.get('capacity') or 1),
        available=bool(data.get('available', True)),
    )
    db.session.add(r)
    db.session.commit()
    return jsonify(r.to_dict()), 201


@app.route('/api/rooms/<int:room_id>', methods=['DELETE'])
def delete_room(room_id):
    r = Room.query.get_or_404(room_id)
    db.session.delete(r)
    db.session.commit()
    return jsonify({"deleted": True})


# Bookings
@app.route('/api/bookings', methods=['GET'])
def list_bookings():
    bookings = Booking.query.order_by(Booking.id.desc()).all()
    return jsonify([b.to_dict() for b in bookings])


@app.route('/api/bookings', methods=['POST'])
def create_booking():
    data = request.json or {}
    student_id = data.get('student_id')
    room_id = data.get('room_id')
    if not student_id or not room_id:
        return jsonify({"error": "student_id and room_id required"}), 400
    room = Room.query.get(room_id)
    if not room:
        return jsonify({"error": "room not found"}), 404
    if not room.available:
        return jsonify({"error": "room not available"}), 400

    b = Booking(student_id=student_id, room_id=room_id, from_date=data.get('from'), to_date=data.get('to'))
    room.available = False
    db.session.add(b)
    db.session.commit()
    return jsonify(b.to_dict()), 201


@app.route('/api/bookings/<int:booking_id>', methods=['DELETE'])
def checkout_booking(booking_id):
    b = Booking.query.get_or_404(booking_id)
    room = Room.query.get(b.room_id)
    if room:
        room.available = True
    db.session.delete(b)
    db.session.commit()
    return jsonify({"checked_out": True})


# Payments
@app.route('/api/payments', methods=['GET'])
def list_payments():
    payments = Payment.query.order_by(Payment.id.desc()).all()
    return jsonify([p.to_dict() for p in payments])


@app.route('/api/payments', methods=['POST'])
def create_payment():
    data = request.json or {}
    booking_id = data.get('booking_id')
    amount = data.get('amount')
    if not booking_id or amount is None:
        return jsonify({"error": "booking_id and amount required"}), 400
    bk = Booking.query.get(booking_id)
    if not bk:
        return jsonify({"error": "booking not found"}), 404

    p = Payment(booking_id=booking_id, amount=int(amount))
    db.session.add(p)
    db.session.commit()
    return jsonify(p.to_dict()), 201


@app.route('/api/payments/<int:payment_id>', methods=['DELETE'])
def delete_payment(payment_id):
    p = Payment.query.get_or_404(payment_id)
    db.session.delete(p)
    db.session.commit()
    return jsonify({"deleted": True})



# Run app

if __name__ == '__main__':
    with app.app_context():
        init_db()  
    app.run(debug=True)