/* Shim: expose CommonJS exports as window.vision so tracker.js can use them */
(function () {
    var exports = {};
    var module = { exports: exports };

    // The CJS bundle references 'exports' globally — inject it
    // Now inline-execute the bundle by re-using the already-loaded content
    // (This file is loaded AFTER vision_bundle.cjs.js via <script>)

    // At this point, window._visionExports has been set by the bundle wrapper
    // We expose the key classes
    if (window._visionExports) {
        window.vision = window._visionExports;
    }
})();
