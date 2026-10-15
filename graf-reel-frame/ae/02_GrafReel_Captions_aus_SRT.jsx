// =====================================================================
//  02_GrafReel_Captions_aus_SRT.jsx
//  Erzeugt animierte Captions im Graf-Stil aus einer .srt-Datei.
//
//  Workflow:
//   1. Premiere: Text > Transkript erstellen > Untertitel erstellen
//      > Datei > Exportieren > Untertitel (.srt)
//   2. AE: Ziel-Comp oeffnen (z.B. GRAF_Reel_MASTER), Skript ausfuehren,
//      .srt waehlen. Pro 1-2 Woerter entsteht ein Text-Layer.
//   Hervorhebung: Woerter im SRT in *Sternchen* setzen -> Serif-Kursiv,
//   Woerter in #Raute# -> Akzentfarbe.
// =====================================================================
#target aftereffects
#include "graf_config.jsxinc"

(function () {
    var comp = app.project.activeItem;
    if (!(comp instanceof CompItem)) { alert("Bitte zuerst die Ziel-Komposition oeffnen/auswaehlen."); return; }
    var f = File.openDialog("SRT-Datei waehlen", "*.srt");
    if (!f) return;
    f.encoding = "UTF-8";
    f.open("r"); var raw = f.read(); f.close();
    raw = raw.replace(/^﻿/, "").replace(/\r/g, "");

    var offset = parseFloat(prompt("Zeitversatz in Sekunden (0 = SRT beginnt bei Comp-Start):", "0")) || 0;

    function tc(s) {
        var m = s.match(/(\d+):(\d+):(\d+)[,.](\d+)/);
        return (+m[1]) * 3600 + (+m[2]) * 60 + (+m[3]) + (+m[4]) / Math.pow(10, m[4].length);
    }

    // SRT parsen
    var blocks = raw.split(/\n\s*\n/), cues = [];
    for (var i = 0; i < blocks.length; i++) {
        var lines = blocks[i].split("\n"), tl = -1;
        for (var j = 0; j < lines.length; j++) if (lines[j].indexOf("-->") > -1) { tl = j; break; }
        if (tl < 0) continue;
        var p = lines[tl].split("-->");
        var txt = lines.slice(tl + 1).join(" ").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").replace(/^\s+|\s+$/g, "");
        if (txt) cues.push({ a: tc(p[0]) + offset, b: tc(p[1]) + offset, t: txt });
    }
    if (!cues.length) { alert("Keine Untertitel gefunden."); return; }

    // In Chunks a 1-2 Woerter teilen, Zeit nach Zeichenanzahl verteilen
    var chunks = [];
    for (var c = 0; c < cues.length; c++) {
        var words = cues[c].t.split(" "), groups = [], cur = [];
        for (var w = 0; w < words.length; w++) {
            var test = cur.concat([words[w]]).join(" ").replace(/[*#]/g, "");
            var marked = /[*#]/.test(words[w]);   // markierte Woerter stehen allein
            if (cur.length && (marked || cur.length >= GRAF.capMaxWords || test.length > GRAF.capMaxChars)) { groups.push(cur.join(" ")); cur = []; }
            cur.push(words[w]);
            if (marked) { groups.push(cur.join(" ")); cur = []; }
        }
        if (cur.length) groups.push(cur.join(" "));
        var total = 0, k;
        for (k = 0; k < groups.length; k++) total += groups[k].length + 2;
        var t0 = cues[c].a, span = cues[c].b - cues[c].a;
        for (k = 0; k < groups.length; k++) {
            var d = span * (groups[k].length + 2) / total;
            chunks.push({ a: t0, b: t0 + d, t: groups[k] });
            t0 += d;
        }
    }

    app.beginUndoGroup("Graf Captions aus SRT");
    var W = comp.width, H = comp.height, sc = W / 1080;
    var white = grafHex(GRAF.text), acc = grafHex(GRAF.accent);
    for (var n = 0; n < chunks.length; n++) {
        var ch = chunks[n], s = ch.t, serif = /\*/.test(s), hi = /#/.test(s);
        s = s.replace(/[*#]/g, "");
        var l = grafText(comp, s, serif ? GRAF.fontSerif : GRAF.fontCaption,
            Math.round(GRAF.capSize * sc * (serif ? 1.8 : 1)), hi ? acc : white, [W / 2, H * GRAF.capY], -10);
        l.name = "CAP " + (n + 1) + " | " + s;
        l.inPoint = Math.max(0, ch.a);
        l.outPoint = (n + 1 < chunks.length) ? Math.max(chunks[n + 1].a, ch.a + 1 / comp.frameRate) : ch.b;
        grafSoftShadow(l);
        grafInAnim(l, "0", GRAF.capInDur, GRAF.capBlur, 88);
        l.comment = "GRAF Caption";
    }
    app.endUndoGroup();
    alert(chunks.length + " Caption-Layer erstellt.\nTipp: Auf weissen Screens Layer-Farbe auf '" + GRAF.ink + "' setzen.");
})();
