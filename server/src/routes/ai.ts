import { Router, Request, Response } from 'express';
import Groq from 'groq-sdk';

const router = Router();

// Get AI suggestions for a trip
router.post('/suggestions', async (req: Request, res: Response) => {
  try {
    const groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });

    const { destination, tripName, groupSize, budget, interests } = req.body;

    const prompt = `You are a travel expert. Suggest 5 activities for a trip to ${destination}.

Trip details:
- Trip name: ${tripName}
- Group size: ${groupSize || 'not specified'}
- Budget: ${budget || 'not specified'}
- Interests: ${interests || 'general sightseeing'}

For each activity, provide:
1. Activity name
2. Brief description (1 sentence)
3. Estimated cost per person
4. Best time to do it

Format your response as a JSON array like this:
[
  {
    "name": "Activity Name",
    "description": "Brief description",
    "cost": "$XX per person",
    "bestTime": "Morning/Afternoon/Evening"
  }
]

Only respond with the JSON array, no other text.`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 1000,
    });

    const content = completion.choices[0]?.message?.content || '[]';
    
    // Parse the JSON response
    let suggestions;
    try {
      suggestions = JSON.parse(content);
    } catch {
      suggestions = [{ name: 'Error parsing suggestions', description: content, cost: 'N/A', bestTime: 'N/A' }];
    }

    res.json({ suggestions });
  } catch (error) {
    console.error('AI suggestion error:', error);
    res.status(500).json({ error: 'Failed to get suggestions' });
  }
});

export default router;