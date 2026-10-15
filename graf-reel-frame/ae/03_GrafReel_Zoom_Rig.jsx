// =====================================================================
//  03_GrafReel_Zoom_Rig.jsx
//  Haengt das Zoom-Rig der Referenz an die ausgewaehlten Footage-Layer:
//   - Slow Push  (Start % -> Ende % ueber die Clipdauer)
//   - Punch-In   (fester Faktor, z.B. 115 % bei jedem 2. Jump-Cut)
//   - Intro-Zoom (schneller Zoom-Out in 0,25 s, wie Referenz 0:00)
// =====================================================================
#target aftereffects
#include "graf_config.jsxinc"

(function () {
    var comp = app.project.activeItem;
    if (!(comp instanceof CompItem) || !comp.selectedLayers.length) { alert("Footage-Layer in einer Comp auswaehlen."); return; }
    app.beginUndoGroup("Graf Zoom-Rig");
    for (var i = 0; i < comp.selectedLayers.length; i++) {
        var l = comp.selectedLayers[i];
        grafFx(l, "ADBE Slider Control", "Zoom Start %").property(1).setValue(100);
        grafFx(l, "ADBE Slider Control", "Zoom Ende %").property(1).setValue(108);
        grafFx(l, "ADBE Slider Control", "Punch-In %").property(1).setValue(i % 2 ? 115 : 100);
        grafFx(l, "ADBE Checkbox Control", "Intro-Zoom-Out").property(1).setValue(0);
        grafTr(l, "ADBE Scale").expression =
            "var a=effect('Zoom Start %')(1), b=effect('Zoom Ende %')(1), p=effect('Punch-In %')(1)/100;" +
            "var t=time-inPoint, s=ease(t,0,Math.max(outPoint-inPoint,0.01),a,b)*p;" +
            "if(effect('Intro-Zoom-Out')(1)==1){ s*=easeOut(t,0,0.25,1.35,1); }" +
            "value.length==3?[value[0]*s/100,value[1]*s/100,value[2]]:[value[0]*s/100,value[1]*s/100];";
    }
    app.endUndoGroup();
})();
