const City = require('../models/City');

// Initialize cities with default fees (0 for both)
const algerianCities = [
    "Adrar", "Chlef", "Laghouat", "Oum El Bouaghi", "Batna", "Béjaïa", "Biskra", "Béchar", "Blida", "Bouira",
    "Tamanrasset", "Tébessa", "Tlemcen", "Tiaret", "Tizi Ouzou", "Algiers", "Djelfa", "Jijel", "Sétif", "Saïda",
    "Skikda", "Sidi Bel Abbès", "Annaba", "Guelma", "Constantine", "Médéa", "Mostaganem", "M'Sila", "Mascara", "Ouargla",
    "Oran", "El Bayadh", "Illizi", "Bordj Bou Arreridj", "Boumerdès", "El Tarf", "Tindouf", "Tissemsilt", "El Oued", "Khenchela",
    "Souk Ahras", "Tipaza", "Mila", "Aïn Defla", "Naâma", "Aïn Témouchent", "Ghardaïa", "Relizane", "Timimoun", "Bordj Badji Mokhtar",
    "Ouled Djellal", "Bél Abbès", "In Salah", "In Guezzam", "Touggourt", "Djanet", "El M'Ghair", "El Meniaa"
];

// Initialize cities in the database if they don't exist
exports.initializeCities = async () => {
    try {
        console.log('Checking if cities need initialization...');
        const count = await City.estimatedDocumentCount();
        console.log(`Found ${count} cities in the database`);
        
        if (count === 0) {
            console.log('No cities found, initializing with default data...');
            const citiesToInsert = algerianCities.map(city => ({
                name: city,
                desktopFee: 0,
                houseFee: 0
            }));
            
            const result = await City.insertMany(citiesToInsert);
            console.log(`Successfully initialized ${result.length} cities in the database`);
            return { initialized: true, count: result.length };
        }
        
        return { initialized: false, count };
    } catch (error) {
        console.error('Error in initializeCities:', error);
        throw error; // Re-throw to be caught by the caller
    }
};

// Get all cities with their fees
exports.getAllCities = async (req, res) => {
    try {
        console.log('Fetching all cities...');
        const cities = await City.find().sort('name');
        console.log(`Found ${cities.length} cities`);
        
        if (cities.length === 0) {
            console.log('No cities found, attempting to initialize...');
            await exports.initializeCities();
            const retryCities = await City.find().sort('name');
            console.log(`After initialization, found ${retryCities.length} cities`);
            return res.json(retryCities);
        }
        
        res.json(cities);
    } catch (error) {
        console.error('Error in getAllCities:', error);
        res.status(500).json({ 
            message: 'Failed to fetch cities',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Update city fees
exports.updateCityFees = async (req, res) => {
    try {
        const { updates } = req.body;
        
        if (!Array.isArray(updates)) {
            return res.status(400).json({ message: 'Invalid request format' });
        }

        const bulkOps = updates.map(update => ({
            updateOne: {
                filter: { _id: update._id },
                update: { 
                    $set: { 
                        desktopFee: parseInt(update.desktopFee) || 0,
                        houseFee: parseInt(update.houseFee) || 0
                    } 
                }
            }
        }));

        await City.bulkWrite(bulkOps);
        
        // Get updated list
        const cities = await City.find().sort('name');
        res.json({ 
            message: 'Fees updated successfully',
            cities 
        });
        
    } catch (error) {
        console.error('Error updating city fees:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
