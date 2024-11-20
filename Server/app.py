from flask import Flask, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from astropy.io import fits
import numpy as np
import matplotlib.pyplot as plt
import io
import base64
import os
from datetime import datetime

plt.switch_backend('Agg')

app = Flask(__name__)
CORS(app)

# Database configuration
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///solar_data.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# Database Model
class SolarObservation(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String(255), unique=True, nullable=False)
    year = db.Column(db.String(4), nullable=False)
    observation_date = db.Column(db.DateTime, nullable=False)
    min_intensity = db.Column(db.Float, nullable=False)
    max_intensity = db.Column(db.Float, nullable=False)
    mean_intensity = db.Column(db.Float, nullable=False)
    std_deviation = db.Column(db.Float, nullable=False)
    histogram_data = db.Column(db.Text, nullable=False)  # Base64 encoded
    image_data = db.Column(db.Text, nullable=False)      # Base64 encoded
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'filename': self.filename,
            'year': self.year,
            'observation_date': self.observation_date.isoformat(),
            'stats': {
                'min': self.min_intensity,
                'max': self.max_intensity,
                'mean': self.mean_intensity,
                'stdev': self.std_deviation
            },
            'histogram': self.histogram_data,
            'image': self.image_data
        }

def parse_observation_date(filename):
    # Extract date and time parts from filename (e.g., "AIA.20221023_084600.0094.synoptic.fits")
    date_part = filename.split('.')[1].split('_')[0]  # "20221023"
    time_part = filename.split('_')[1][:6]  # "084600"
    
    datetime_str = f"{date_part}{time_part}"
    return datetime.strptime(datetime_str, "%Y%m%d%H%M%S")

@app.route('/api/years', methods=['GET'])
def get_available_years():
    try:
        years = db.session.query(SolarObservation.year).distinct().all()
        return jsonify([year[0] for year in years])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/files/<year>', methods=['GET'])
def get_files_for_year(year):
    try:
        observations = SolarObservation.query.filter_by(year=year).all()
        return jsonify([obs.filename for obs in observations])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/fits-data/<year>/<filename>', methods=['GET'])
def get_fits_data(year, filename):
    try:
        observation = SolarObservation.query.filter_by(year=year, filename=filename).first()
        if observation:
            return jsonify(observation.to_dict())
        
        # If not in database, process the FITS file and store it
        file_path = f'./AIA_level_1.5/{year}/{filename}'
        observation_data = process_fits_file(file_path, year, filename)
        
        new_observation = SolarObservation(
            filename=filename,
            year=year,
            observation_date=parse_observation_date(filename),
            min_intensity=observation_data['stats']['min'],
            max_intensity=observation_data['stats']['max'],
            mean_intensity=observation_data['stats']['mean'],
            std_deviation=observation_data['stats']['stdev'],
            histogram_data=observation_data['histogram'],
            image_data=observation_data['image']
        )
        
        db.session.add(new_observation)
        db.session.commit()
        
        return jsonify(observation_data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def process_fits_file(file_path, year, filename):
    hdu_list = fits.open(file_path)
    image_data = hdu_list[1].data
    
    stats = {
        'min': float(np.min(image_data)),
        'max': float(np.max(image_data)),
        'mean': float(np.mean(image_data)),
        'stdev': float(np.std(image_data))
    }
    
    # Generate histogram
    plt.figure(figsize=(10, 6))
    plt.hist(image_data.flatten(), bins='auto')
    plt.title('Pixel Value Distribution')
    plt.xlabel('Pixel Value')
    plt.ylabel('Frequency')
    
    hist_buffer = io.BytesIO()
    plt.savefig(hist_buffer, format='png')
    hist_buffer.seek(0)
    hist_base64 = base64.b64encode(hist_buffer.getvalue()).decode()
    plt.close()
    
    # Generate image
    normalized_data = ((image_data - np.min(image_data)) /
                      (np.max(image_data) - np.min(image_data)) * 255).astype(np.uint8)
    
    plt.figure(figsize=(10, 10))
    plt.imshow(normalized_data, cmap='gray')
    plt.colorbar()
    
    img_buffer = io.BytesIO()
    plt.savefig(img_buffer, format='png')
    img_buffer.seek(0)
    img_base64 = base64.b64encode(img_buffer.getvalue()).decode()
    plt.close()
    
    return {
        'stats': stats,
        'histogram': hist_base64,
        'image': img_base64
    }

@app.cli.command("init-db")
def init_db():
    db.create_all()
    print("Database initialized!")

@app.cli.command("populate-db")
def populate_db():
    base_dir = './AIA_level_1.5'
    for year in os.listdir(base_dir):
        if os.path.isdir(os.path.join(base_dir, year)):
            year_dir = os.path.join(base_dir, year)
            for filename in os.listdir(year_dir):
                if filename.endswith('.fits'):
                    if not SolarObservation.query.filter_by(filename=filename).first():
                        try:
                            file_path = os.path.join(year_dir, filename)
                            observation_data = process_fits_file(file_path, year, filename)
                            
                            new_observation = SolarObservation(
                                filename=filename,
                                year=year,
                                observation_date=parse_observation_date(filename),
                                min_intensity=observation_data['stats']['min'],
                                max_intensity=observation_data['stats']['max'],
                                mean_intensity=observation_data['stats']['mean'],
                                std_deviation=observation_data['stats']['stdev'],
                                histogram_data=observation_data['histogram'],
                                image_data=observation_data['image']
                            )
                            
                            db.session.add(new_observation)
                            print(f"Added observation: {filename}")
                            db.session.commit()
                        except Exception as e:
                            print(f"Error processing {filename}: {str(e)}")
                            db.session.rollback()
    print("Database populated!")

if __name__ == '__main__':
    app.run(debug=True)