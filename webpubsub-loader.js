// WebPubSub Client Loader - Wrapper to load the ES module properly
(async function() {
    try {
        console.log('[WebPubSub Loader] Loading WebPubSubClient module...');
        
        // Dynamically import the ES module
        const module = await import('https://cdn.jsdelivr.net/npm/@azure/web-pubsub-client@1.0.2/dist/browser/index.min.js');
        
        // Make it available globally
        window.WebPubSubClient = module.WebPubSubClient;
        
        // Also expose it in an azure namespace for compatibility
        window.azure = window.azure || {};
        window.azure.webPubSubClient = window.azure.webPubSubClient || {};
        window.azure.webPubSubClient.WebPubSubClient = module.WebPubSubClient;
        
        console.log('[WebPubSub Loader] WebPubSubClient loaded successfully!');
        console.log('[WebPubSub Loader] Available as: window.WebPubSubClient or azure.webPubSubClient.WebPubSubClient');
        
        // Dispatch event to signal readiness
        window.dispatchEvent(new Event('webpubsub-ready'));
        
    } catch (error) {
        console.error('[WebPubSub Loader] Failed to load WebPubSubClient:', error);
    }
})();