const HeroIngredient = require('../models/HeroIngredient');
const cloudinary = require('../config/cloudinary');

// Add new hero ingredient
exports.addHeroIngredient = async (req, res) => {
    try {
        const { name, descriptions } = req.body;

        // Validation
        if (!name || typeof name !== 'string' || name.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid name'
            });
        }

        if (!descriptions || !Array.isArray(descriptions) || descriptions.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Please provide at least one description'
            });
        }

        // Check if image is provided
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Please provide an image'
            });
        }

        // Upload image to Cloudinary
        const uploadResult = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
                { folder: "hero-ingredients" },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            );
            stream.end(req.file.buffer);
        });

        // Filter out empty descriptions
        const validDescriptions = descriptions.filter(desc => 
            typeof desc === 'string' && desc.trim() !== ''
        );

        if (validDescriptions.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Please provide at least one valid description'
            });
        }

        // Check if hero ingredient with same name already exists
        const existingIngredient = await HeroIngredient.findOne({ 
            name: { $regex: new RegExp('^' + name.trim() + '$', 'i') }
        });

        if (existingIngredient) {
            return res.status(400).json({
                success: false,
                message: 'A hero ingredient with this name already exists'
            });
        }

        const heroIngredient = await HeroIngredient.create({
            name: name.trim(),
            descriptions: validDescriptions.map(desc => desc.trim()),
            image_url: uploadResult.secure_url
        });

        res.status(201).json({
            success: true,
            heroIngredient
        });
    } catch (error) {
        console.error('Error in addHeroIngredient:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding hero ingredient'
        });
    }
};

// Get all hero ingredients
exports.getAllHeroIngredients = async (req, res) => {
    try {
        const heroIngredients = await HeroIngredient.find()
            .sort({ name: 1 });

        res.status(200).json({
            success: true,
            heroIngredients
        });
    } catch (error) {
        console.error('Error in getAllHeroIngredients:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching hero ingredients'
        });
    }
};

// Get hero ingredient by ID
exports.getHeroIngredientById = async (req, res) => {
    try {
        const heroIngredient = await HeroIngredient.findById(req.params.id);
        
        if (!heroIngredient) {
            return res.status(404).json({
                success: false,
                message: 'Hero ingredient not found'
            });
        }

        res.status(200).json({
            success: true,
            heroIngredient
        });
    } catch (error) {
        console.error('Error in getHeroIngredientById:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching hero ingredient'
        });
    }
};

// Update hero ingredient
exports.updateHeroIngredient = async (req, res) => {
    try {
        const { name, descriptions } = req.body;
        const updateData = {
            name: name.trim(),
            descriptions: descriptions.filter(desc => 
                typeof desc === 'string' && desc.trim() !== ''
            ).map(desc => desc.trim())
        };

        // Handle image update if new image is provided
        if (req.file) {
            const uploadResult = await new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    { folder: "hero-ingredients" },
                    (error, result) => {
                        if (error) reject(error);
                        else resolve(result);
                    }
                );
                stream.end(req.file.buffer);
            });
            updateData.image_url = uploadResult.secure_url;
        }

        const heroIngredient = await HeroIngredient.findByIdAndUpdate(
            req.params.id,
            updateData,
            {
                new: true,
                runValidators: true
            }
        );

        if (!heroIngredient) {
            return res.status(404).json({
                success: false,
                message: 'Hero ingredient not found'
            });
        }

        res.status(200).json({
            success: true,
            heroIngredient
        });
    } catch (error) {
        console.error('Error in updateHeroIngredient:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating hero ingredient'
        });
    }
};

// Delete hero ingredient
exports.deleteHeroIngredient = async (req, res) => {
    try {
        const heroIngredient = await HeroIngredient.findByIdAndDelete(req.params.id);

        if (!heroIngredient) {
            return res.status(404).json({
                success: false,
                message: 'Hero ingredient not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Hero ingredient deleted successfully'
        });
    } catch (error) {
        console.error('Error in deleteHeroIngredient:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting hero ingredient'
        });
    }
};
