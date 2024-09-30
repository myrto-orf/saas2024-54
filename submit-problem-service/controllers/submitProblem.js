const axios = require('axios');

//Function for problem submission
exports.submit = async (req, res) => {
    try {
        const {
            problemType, sessionId, sessionBalance, locationFile,
            numVehicles, depot, maxDistance, objectiveFunction,
            constraints, optGoal, itemWeights, itemValues, capacity
        } = req.body;

        // Check if problemType and sessionId are provided
        if (!problemType || !sessionId) {
            return res.status(400).json({ message: 'Problem type and sessionId are required' });
        }

        // Check if session balance is valid
        if (sessionBalance === undefined || sessionBalance <= 0) {
            return res.status(403).json({ message: 'Insufficient balance to submit the problem' });
        }

        // Prepare payload for problem type
        let payload = { problemType, sessionId };

        if (problemType === 'vrp') {
            if (!locationFile || !numVehicles || depot === undefined || !maxDistance) {
                return res.status(400).json({ message: 'Missing required parameters for VRP' });
            }
            payload.locationFile = locationFile;
            payload.numVehicles = numVehicles;
            payload.depot = depot;
            payload.maxDistance = maxDistance;
        } else if (problemType === 'lp') {
            if (!objectiveFunction || !constraints || !optGoal) {
                return res.status(400).json({ message: 'Missing required parameters for LP' });
            }
            payload.objectiveFunction = objectiveFunction;
            payload.constraints = constraints;
            payload.optGoal = optGoal;
        } else if (problemType === 'knapsack') {
            if (!itemWeights || !itemValues || !capacity) {
                return res.status(400).json({ message: 'Missing required parameters for Knapsack' });
            }
            payload.itemWeights = itemWeights.split(',').map(Number);
            payload.itemValues = itemValues.split(',').map(Number);
            payload.capacity = capacity;
        }

        console.log('Submitting problem to manage problem service:', payload);

        // Session balance deduction
        const newBalance = sessionBalance - 1;

        const manageServiceUrl = 'http://manage_problems_service:4004/problems';

        try {
            const manageResponse = await axios.post(manageServiceUrl, {
                ...payload,
                sessionId,
                problemType,
                newBalance
            });

            const executionId = manageResponse.data.executionId;

            // Update balance in buy-credits-service
            const creditsServiceUrl = 'http://buy_credits_service:4002/update';
            await axios.post(creditsServiceUrl, {
                sessionId,
                newBalance
            });

            return res.status(200).json({
                message: 'Problem submitted successfully',
                newBalance,
                executionId
            });

        } catch (manageError) {
            return res.status(500).json({
                message: 'Failed to submit problem to manage_problems_service.',
                error: manageError.message
            });
        }
    } catch (error) {
        return res.status(500).json({
            message: 'Internal server error. Unable to process the problem submission.',
            error: error.message
        });
    }
};
