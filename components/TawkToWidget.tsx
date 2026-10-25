import Script from "next/script";

const propertyId = process.env.NEXT_PUBLIC_TAWKTO_PROPERTY_ID?.trim();
const widgetId = process.env.NEXT_PUBLIC_TAWKTO_WIDGET_ID?.trim();

export function TawkToWidget() {
  if (!propertyId || !widgetId) {
    return null;
  }

  const scriptSrc = `https://embed.tawk.to/${propertyId}/${widgetId}`;

  const inlineScript = `
    var Tawk_API = window.Tawk_API || {};
    var Tawk_LoadStart = new Date();
    (function() {
      var loaded = false;
      function load() {
      if (loaded) return; loaded = true;
      var s1 = document.createElement("script");
      var s0 = document.getElementsByTagName("script")[0];
      s1.async = true;
      s1.src = "${scriptSrc}";
      s1.charset = "UTF-8";
      s1.setAttribute("crossorigin", "*");
      s0.parentNode.insertBefore(s1, s0);
      }
      // Defer the chat widget until the visitor interacts (or 8s idle) so it
      // doesn't compete with first paint.
      ["pointerdown","keydown","scroll","touchstart"].forEach(function(e){
        window.addEventListener(e, load, { once: true, passive: true });
      });
      setTimeout(load, 8000);
    })();
  `;

  return <Script id="tawk-to-widget" strategy="lazyOnload">{inlineScript}</Script>;
}
