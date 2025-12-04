/**
 * Image Generation API Proxy
 * Proxies requests to Fal.ai for secure image generation
 */

export const config = {
    runtime: 'edge'
};

export default async function handler(req) {
    // Only allow POST
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const FAL_KEY = process.env.FAL_KEY;

    if (!FAL_KEY) {
        return new Response(JSON.stringify({ error: 'FAL_KEY not configured' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const body = await req.json();
        const { 
            prompt,
            image_size = 'landscape_4_3',
            num_inference_steps = 30,
            num_images = 1,
            enable_safety_checker = true
        } = body;

        if (!prompt || typeof prompt !== 'string') {
            return new Response(JSON.stringify({ error: 'Prompt is required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Validate and clamp inference steps to safe range
        const clampedSteps = Math.min(Math.max(Number(num_inference_steps) || 30, 10), 50);

        // Call Fal.ai API
        const response = await fetch('https://fal.run/fal-ai/z-image/turbo', {
            method: 'POST',
            headers: {
                'Authorization': `Key ${FAL_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                prompt,
                image_size,
                num_inference_steps: clampedSteps,
                num_images: Math.min(Number(num_images) || 1, 4), // Cap at 4 images max
                enable_safety_checker: Boolean(enable_safety_checker)
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return new Response(JSON.stringify({
                error: errorData.detail || errorData.message || 'Image generation failed',
                status: response.status
            }), {
                status: response.status,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const result = await response.json();

        return new Response(JSON.stringify(result), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Image generation error:', error);
        return new Response(JSON.stringify({
            error: error.message || 'Internal server error'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
