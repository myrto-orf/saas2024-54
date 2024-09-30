const sequelize = require('../utils/database'); // Assuming this exports a configured Sequelize instance
const initModels = require("../models/init-models");
const models = initModels(sequelize);

// Function to get the balance
exports.getBalance = async (req, res) => {
    // Get sessionId from query params
    const sessionId = req.query.sessionId;

    try {
        // Fetch the specific session by sessionId
        let sessionData = await models.Session.findOne({ where: { sid: sessionId } });

        if (!sessionData) {
            return res.status(404).json({ message: 'Session not found', balance: 0 });
        }

        const sessionParsedData = JSON.parse(sessionData.data || '{}');
        const balance = sessionParsedData.balance || 0;

        return res.status(200).json({ balance });
    } catch (error) {
        console.error('Error fetching session balance:', error.message);
        return res.status(500).json({ message: 'Internal server error', balance: 0 });
    }
};

// Function to buy credits
exports.buyCredits = async (req, res) => {
    const creditsToAdd = req.body.credits;
    const sessionId = req.body.sessionId;
    const currentBalance = Number(req.body.currentBalance);

    // Ensure current balance is a valid number
    const currentBalanceNum = isNaN(currentBalance) ? 0 : currentBalance;

    console.log('buy: Received request. Session ID:', sessionId, 'Credits to add:', creditsToAdd, 'Current Balance:', currentBalanceNum);

    try {
        // Check if the session exists in the Session table
        let sessionData = await models.Session.findOne({ where: { sid: sessionId } });
        console.log('Session data found:', sessionData);

        // If session doesn't exist, create it
        if (!sessionData) {
            console.log(`Session ${sessionId} not found, creating a new one.`);
            sessionData = await models.Session.create({
                sid: sessionId,
                expire: new Date(Date.now() + 24 * 60 * 60 * 1000),
                data: JSON.stringify({ balance: 0 })
            });
            console.log('New session created:', sessionData);
        }

        // Parse the session data to get the current balance stored in session
        let sessionParsedData = JSON.parse(sessionData.data || '{}');
        const existingBalance = sessionParsedData.balance || 0;

        // Add credits to the existing balance
        const creditsToAddNum = Number(creditsToAdd);
        const newBalance = existingBalance + creditsToAddNum;

        // Update session data with new balance
        sessionParsedData.balance = newBalance;
        sessionData.data = JSON.stringify(sessionParsedData);
        await sessionData.save();

        console.log('buy: Updated session balance saved. New Balance:', newBalance);


        return res.status(200).json({
            message: 'Credits added successfully.',
            creditsAdded: creditsToAdd,
            newBalance: newBalance
        });

    } catch (error) {
        console.error('buy: Error adding credits:', error);
        return res.status(500).json({
            message: 'Internal server error. Failed to add credits.'
        });
    }
};

// Function to update credits
exports.updateCredits = async (req, res) => {
    const { sessionId, newBalance } = req.body;

    // Validate the request payload
    if (!sessionId || newBalance === undefined) {
        return res.status(400).json({
            message: 'SessionId and newBalance are required'
        });
    }

    try {
        // Find the session data by sessionId
        let sessionData = await models.Session.findOne({ where: { sid: sessionId } });

        if (!sessionData) {
            return res.status(404).json({
                message: 'Session not found'
            });
        }

        let sessionParsedData = JSON.parse(sessionData.data || '{}');
        sessionParsedData.balance = newBalance;  // Update balance

        // Save the updated balance back to session data
        sessionData.data = JSON.stringify(sessionParsedData);
        await sessionData.save();

        console.log(`Balance for session ${sessionId} updated to ${newBalance}`);

        return res.status(200).json({
            message: 'Balance updated successfully',
            sessionId,
            newBalance
        });

    } catch (error) {
        console.error('Error updating balance:', error.message);
        return res.status(500).json({
            message: 'Internal server error. Failed to update balance.',
            error: error.message
        });
    }
};