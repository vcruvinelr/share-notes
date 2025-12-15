// MongoDB initialization script
db = db.getSiblingDB('syncpad');

// Create collections
db.createCollection('note_contents');

// Create indexes for better performance
db.note_contents.createIndex({ "created_at": -1 });
db.note_contents.createIndex({ "updated_at": -1 });

print('MongoDB initialized successfully');
