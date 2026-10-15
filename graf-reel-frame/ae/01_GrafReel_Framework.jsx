// =====================================================================
//  01_GrafReel_Framework.jsx
//  Baut das komplette Graf-Gruppe Reel-Frame als After-Effects-Projekt
//  und exportiert die Module optional als .mogrt fuer Premiere Pro.
//
//  Ausfuehren: AE > Datei > Skripte > Skriptdatei ausfuehren...
//  Voraussetzung: AE 2022 oder neuer. Einstellung
//  "Skripten das Schreiben von Dateien und Netzwerkzugriff erlauben" aktiv.
// =====================================================================
#target aftereffects
#include "graf_config.jsxinc"

(function () {
    var W = GRAF.W, H = GRAF.H, FPS = GRAF.FPS;
    var WHITE = grafHex(GRAF.text), INK = grafHex(GRAF.ink);
    var built = [];      // {comp, mogrt:bool}

    app.beginUndoGroup("Graf Reel-Frame bauen");
    var proj = app.project || app.newProject();

    function folder(name) { var f = proj.items.addFolder(name); return f; }
    var fRoot = folder("GRAF_REEL_FRAME");
    var fMaster = folder("01_MASTER"); fMaster.parentFolder = fRoot;
    var fMod = folder("02_MODULE"); fMod.parentFolder = fRoot;
    var fSub = folder("02b_BAUSTEINE"); fSub.parentFolder = fRoot;
    var fFoot = folder("03_FOOTAGE"); fFoot.parentFolder = fRoot;
    var fLogo = folder("04_LOGOS_ICONS"); fLogo.parentFolder = fRoot;
    var fSfx = folder("05_SFX"); fSfx.parentFolder = fRoot;

    function comp(name, dur, fld, w, h) {
        var c = proj.items.addComp(name, w || W, h || H, 1, dur, FPS);
        c.parentFolder = fld || fMod;
        c.bgColor = [0, 0, 0];
        return c;
    }

    // STEUERUNG-Null mit Akzentfarbe + beliebigen Slidern
    function ctrl(c, sliders) {
        var n = c.layers.addNull(c.duration);
        n.name = "STEUERUNG";
        grafFx(n, "ADBE Color Control", "Akzent").property(1).setValue(grafC4(GRAF.accent));
        grafFx(n, "ADBE Color Control", "Akzent hell").property(1).setValue(grafC4(GRAF.accent2));
        for (var i = 0; i < (sliders || []).length; i++) {
            grafFx(n, "ADBE Slider Control", sliders[i][0]).property(1).setValue(sliders[i][1]);
        }
        n.enabled = false;
        return n;
    }
    var ACC = 'thisComp.layer("STEUERUNG").effect("Akzent")(1)';
    var ACC2 = 'thisComp.layer("STEUERUNG").effect("Akzent hell")(1)';
    function S(name) { return 'thisComp.layer("STEUERUNG").effect("' + name + '")(1)'; }

    function exposeCtrl(c, items) {
        var n = c.layer("STEUERUNG");
        for (var i = 0; i < items.length; i++) {
            grafExposeMGT(grafFxGet(n, items[i][0]).property(1), c, items[i][1]);
        }
    }
    function exposeText(c, layer, label) {
        grafExposeMGT(layer.property("ADBE Text Properties").property("ADBE Text Document"), c, label);
    }

    // =================================================================
    // M01 CAPTION  -  1-2 Woerter, Fade+Blur+Scale-In, Brusthoehe
    // =================================================================
    (function () {
        var c = comp("M01_Caption", 10);
        c.motionGraphicsTemplateName = "GRAF Caption";
        ctrl(c, [["Groesse %", 100], ["Hoehe %", GRAF.capY * 100]]);
        var t = grafText(c, "Traumlage", GRAF.fontCaption, GRAF.capSize, WHITE, [W / 2, H * GRAF.capY], -10);
        t.name = "CAPTION";
        grafSoftShadow(t);
        grafInAnim(t, "0", GRAF.capInDur, GRAF.capBlur, 88);
        grafTr(t, "ADBE Position").expression = "[value[0], thisComp.height*" + S("Hoehe %") + "/100];";
        // Groesse ueber Slider (multipliziert mit In-Animation)
        grafTr(t, "ADBE Scale").expression = grafTr(t, "ADBE Scale").expression.replace("var s=", "var g=" + S("Groesse %") + "/100;var s=g*");
        exposeText(c, t, "Caption-Text");
        exposeCtrl(c, [["Groesse %", "Groesse %"], ["Hoehe %", "Hoehe (% Bild)"]]);
        built.push({ comp: c, mogrt: true });
    })();

    // =================================================================
    // M02 HOOK  -  kleine Grotesk-Zeile + grosse Serif-Kursiv, Wort-Aufbau
    // =================================================================
    (function () {
        var c = comp("M02_Hook_Serif", 10);
        c.motionGraphicsTemplateName = "GRAF Hook (2 Zeilen)";
        ctrl(c, [["Wort-Takt (s)", 0.28]]);
        var y = H * 0.41;
        var l1 = grafText(c, "Hör auf", GRAF.fontCaption, 52, WHITE, [W / 2, y - 92], -10);
        l1.name = "ZEILE_1";
        grafSoftShadow(l1);
        grafInAnim(l1, "0", 0.2, 16, 90);
        var l2 = grafText(c, "Portale zu durchsuchen", GRAF.fontSerif, 118, WHITE, [W / 2, y + 24], -20);
        l2.name = "ZEILE_2";
        grafSoftShadow(l2);
        grafInAnim(l2, "0.2", 0.2, 16, 92);
        // Wort fuer Wort aufbauen (wie Referenz: "Video" -> "Video Editoren")
        l2.property("ADBE Text Properties").property("ADBE Text Document").expression =
            "var v=(typeof value.text==='string')?value.text:String(value); var w=v.split(' '); var t=time-inPoint-0.2; var k=" + S("Wort-Takt (s)") + ";" +
            "t<0?'':w.slice(0,Math.min(w.length,1+Math.floor(t/k))).join(' ');";
        exposeText(c, l1, "Zeile 1 (klein)");
        exposeText(c, l2, "Zeile 2 (Serif gross)");
        exposeCtrl(c, [["Wort-Takt (s)", "Wort-Takt (s)"]]);
        built.push({ comp: c, mogrt: true });
    })();

    // =================================================================
    // M02b SUCH-HOOK  -  Icon + Lupe faehrt ein (AE-Modul, Icon tauschen)
    // =================================================================
    (function () {
        var icon = comp("ICON_SLOT", 10, fSub, 300, 300);
        var bg = grafRect(icon, "PLATZHALTER_ICON", 300, 300, 70, GRAF.accent, 100);
        var ph = grafText(icon, "ICON", GRAF.fontLabel, 60, INK, [150, 172], 0);
        ph.name = "HIER EIGENES ICON/LOGO EINSETZEN";

        var c = comp("M02b_Hook_Lupe", 10);
        ctrl(c, [["Lupe ab (s)", 0.35]]);
        var il = c.layers.add(icon);
        il.name = "ICON";
        grafTr(il, "ADBE Position").setValue([W / 2, H * 0.62]);
        grafInAnim(il, "0", 0.3, 20, 60);
        try { grafFx(il, "ADBE Glo2", "Glow"); } catch (e) {}

        var lupe = c.layers.addNull(10);
        lupe.name = "LUPE_STEUERUNG";
        grafTr(lupe, "ADBE Position").expression =
            "var t=time-inPoint-" + S("Lupe ab (s)") + ";" +
            "var a=[thisComp.width*0.95,thisComp.height*0.86], b=thisComp.layer('ICON').transform.position;" +
            "var p=t<0?a:ease(t,0,0.55,a,b);" +
            "t>0.55? p+[Math.sin(t*2.2)*14,Math.cos(t*1.7)*10] : p;";
        var ring = grafEllipse(c, "LUPE_GLAS", 330, "#FFFFFF", 8, "#FFFFFF", 12);
        ring.parent = lupe; grafTr(ring, "ADBE Position").setValue([0, 0]);
        var handle = grafRect(c, "LUPE_GRIFF", 26, 260, 13, "#D9D9D9", 100);
        handle.parent = lupe;
        grafTr(handle, "ADBE Position").setValue([180, 180]);
        grafTr(handle, "ADBE Anchor Point").setValue([0, -130]);
        grafTr(handle, "ADBE Rotate Z").setValue(-45);
        handle.moveAfter(ring);
        grafTr(ring, "ADBE Opacity").expression = "time-inPoint<" + S("Lupe ab (s)") + "?0:100;";
        grafTr(handle, "ADBE Opacity").expression = grafTr(ring, "ADBE Opacity").expression;
        built.push({ comp: c, mogrt: false });
    })();

    // =================================================================
    // M03 FAKTEN-KACHEL  -  Akzent-Kachel mit Wert + Label (Pop-In)
    // =================================================================
    function tile(c, name, value, label, x, y, delayExpr) {
        var size = 300;
        var n = c.layers.addNull(c.duration);
        n.name = name;
        grafTr(n, "ADBE Position").setValue([x, y]);
        grafTr(n, "ADBE Scale").expression =
            "var t=time-inPoint-(" + delayExpr + ");" +
            "var s=t<0?0:(t<0.22?easeOut(t,0,0.22,0,108):easeOut(t,0.22,0.38,108,100));[s,s];";

        var sh = grafRect(c, name + "_SCHATTEN", size, size, 66, "#000000", 18);
        sh.parent = n; grafTr(sh, "ADBE Position").setValue([0, 14]);
        grafFx(sh, "ADBE Gaussian Blur 2", "Weich").property(1).setValue(30);

        var bx = grafRect(c, name + "_KACHEL", size, size, 66, GRAF.accent, 100);
        bx.parent = n; grafTr(bx, "ADBE Position").setValue([0, 0]);
        grafShapeFill(bx).expression = ACC + ";";

        var hl = grafEllipse(c, name + "_HIGHLIGHT", 260, GRAF.accent2, 90);
        hl.parent = n; grafTr(hl, "ADBE Position").setValue([70, -70]);
        grafShapeFill(hl).expression = ACC2 + ";";
        grafFx(hl, "ADBE Gaussian Blur 2", "Weich").property(1).setValue(60);
        // Highlight auf Kachel begrenzen: Kachel-Duplikat als Alpha-Matte
        var m = bx.duplicate(); m.name = name + "_MATTE"; m.parent = n;
        m.moveBefore(hl);
        hl.trackMatteType = TrackMatteType.ALPHA;

        var v = grafText(c, value, GRAF.fontCaption, 92, INK, [0, 32], -20);
        v.name = name + "_WERT"; v.parent = n; grafTr(v, "ADBE Position").setValue([0, 32]);
        var lb = grafText(c, label, GRAF.fontLabel, 38, INK, [0, 222], -10);
        lb.name = name + "_LABEL"; lb.parent = n; grafTr(lb, "ADBE Position").setValue([0, 222]);
        return { n: n, v: v, lb: lb, layers: [sh, bx, hl, m, v, lb] };
    }

    (function () {
        var c = comp("M03_Fakten_Kachel", 10);
        c.motionGraphicsTemplateName = "GRAF Fakten-Kachel";
        ctrl(c, [["Verzoegerung (s)", 0]]);
        var k = tile(c, "K1", "120 m²", "Wohnfläche", W / 2, H * 0.5, S("Verzoegerung (s)"));
        // Label auf Video: weiss + Schatten
        var td = k.lb.property("ADBE Text Properties").property("ADBE Text Document").value;
        td.fillColor = WHITE; k.lb.property("ADBE Text Properties").property("ADBE Text Document").setValue(td);
        grafSoftShadow(k.lb);
        exposeText(c, k.v, "Wert");
        exposeText(c, k.lb, "Label");
        grafExposeMGT(grafTr(c.layer("K1"), "ADBE Position"), c, "Position");
        exposeCtrl(c, [["Akzent", "Akzentfarbe"], ["Verzoegerung (s)", "Verzoegerung (s)"]]);
        built.push({ comp: c, mogrt: true });
    })();

    // =================================================================
    // M04 GLEICHUNG  -  weisser Screen: Kachel A + Kachel B + Caption
    //   (Referenz 0:03-0:07 "Gute Preise + Schlechte Ergebnisse")
    // =================================================================
    (function () {
        var c = comp("M04_Gleichung_Screen", 6);
        c.motionGraphicsTemplateName = "GRAF Gleichung (A + B)";
        ctrl(c, [["Kachel B ab (s)", 1.4], ["Outro ab (s)", 3.8]]);
        var bg = c.layers.addSolid(grafHex(GRAF.paper), "PAPIER", W, H, 1, c.duration);
        bg.moveToEnd();
        var y = H * 0.44;
        // Kachel A startet zentriert und rutscht nach links, wenn B kommt
        var a = tile(c, "KA", "Top", "Lage", W / 2, y, "0");
        grafTr(a.n, "ADBE Position").expression =
            "var t=time-inPoint-" + S("Kachel B ab (s)") + ";" +
            "[ease(t,0,0.3," + (W / 2) + "," + (W / 2 - 230) + "), value[1]];";
        var b = tile(c, "KB", "0 €", "Provision", W / 2 + 230, y, S("Kachel B ab (s)") + "+0.08");
        var plus = grafEllipse(c, "PLUS_KREIS", 64, GRAF.ink, 100);
        grafTr(plus, "ADBE Position").setValue([W / 2, y]);
        var pt = grafText(c, "+", GRAF.fontCaption, 52, grafHex(GRAF.paper), [W / 2, y + 18], 0);
        pt.name = "PLUS";
        grafInAnim(plus, S("Kachel B ab (s)"), 0.2, 0, 0);
        grafInAnim(pt, S("Kachel B ab (s)"), 0.2, 0, 0);
        var cap = grafText(c, "für Ihre Familie", GRAF.fontCaption, GRAF.capSize, INK, [W / 2, y + 380], -10);
        cap.name = "CAPTION_DUNKEL";
        grafInAnim(cap, "0.1", GRAF.capInDur, GRAF.capBlur, 88);
        // Outro: alles faded + blurt raus (Referenz 0:06.8)
        var adj = c.layers.addSolid([1, 1, 1], "OUTRO_BLUR", W, H, 1, c.duration);
        adj.adjustmentLayer = true;
        adj.moveToBeginning();
        grafFx(adj, "ADBE Gaussian Blur 2", "Blur").property(1).expression =
            "linear(time-inPoint," + S("Outro ab (s)") + "," + S("Outro ab (s)") + "+0.25,0,30);";
        // Outro-Fade fuer alle sichtbaren Elemente
        // (Nulls vererben keine Deckkraft -> Kacheln einzeln ueber ihre Layer)
        var ids = [plus, pt, cap];
        for (var i = 0; i < ids.length; i++) {
            var op = grafTr(ids[i], "ADBE Opacity");
            op.expression = (op.expression ? op.expression.replace(/;\s*$/, "") : "value") +
                "*linear(time-inPoint," + S("Outro ab (s)") + "," + S("Outro ab (s)") + "+0.25,1,0.2);";
        }
        var kids = a.layers.concat(b.layers);
        for (var j = 0; j < kids.length; j++) {
            var o2 = grafTr(kids[j], "ADBE Opacity");
            o2.expression = "value*linear(time-inPoint," + S("Outro ab (s)") + "," + S("Outro ab (s)") + "+0.25,1,0.2);";
        }
        exposeText(c, a.v, "Wert A"); exposeText(c, a.lb, "Label A");
        exposeText(c, b.v, "Wert B"); exposeText(c, b.lb, "Label B");
        exposeText(c, cap, "Caption");
        exposeCtrl(c, [["Akzent", "Akzentfarbe"], ["Kachel B ab (s)", "Kachel B ab (s)"], ["Outro ab (s)", "Outro ab (s)"]]);
        built.push({ comp: c, mogrt: true });
    })();

    // =================================================================
    // M05a PROOF-PILL  -  Pille mit Punkt + Schreibmaschinen-Text
    // =================================================================
    function proofPill(c, y) {
        var pill = grafRect(c, "PILL", 640, 76, 38, GRAF.glass, 82, GRAF.accent, 1.5);
        grafTr(pill, "ADBE Position").setValue([W / 2, y]);
        grafShapeStroke(pill).expression = ACC + ";";
        grafInAnim(pill, "0", 0.25, 12, 90);
        var dot = grafEllipse(c, "PUNKT", 20, GRAF.accent, 100);
        grafTr(dot, "ADBE Position").setValue([W / 2 - 270, y]);
        grafShapeFill(dot).expression = ACC + ";";
        grafInAnim(dot, "0.05", 0.2, 0, 0);
        var tx = grafText(c, "+350 verkaufte Immobilien", GRAF.fontLabel, 30, WHITE, [W / 2 + 18, y + 11], -10);
        tx.name = "PILL_TEXT";
        tx.property("ADBE Text Properties").property("ADBE Text Document").expression =
            "var v=(typeof value.text==='string')?value.text:String(value); var t=time-inPoint-0.3; v.substr(0,Math.floor(linear(t,0,0.7,0,v.length)));";
        return tx;
    }
    (function () {
        var c = comp("M05a_Proof_Pill", 10);
        c.motionGraphicsTemplateName = "GRAF Proof-Pill";
        ctrl(c, []);
        var tx = proofPill(c, H * 0.63);
        exposeText(c, tx, "Proof-Text");
        exposeCtrl(c, [["Akzent", "Akzentfarbe"]]);
        built.push({ comp: c, mogrt: true });
    })();

    // =================================================================
    // M05b LOGO-WAND  -  Glas-Panel, 2 Reihen Logos laufen durch (AE)
    // =================================================================
    (function () {
        var stripW = 2400;
        var strip = comp("LOGO_STREIFEN", 10, fSub, stripW * 2, 260);
        for (var rep = 0; rep < 2; rep++) {
            for (var i = 0; i < 6; i++) {
                for (var r = 0; r < 2; r++) {
                    var idx = i * 2 + r + 1;
                    var t = grafText(strip, "LOGO " + idx, GRAF.fontLabel, 38, WHITE,
                        [rep * stripW + 200 + i * 400 + r * 200, 90 + r * 110], 0);
                    t.name = "LOGO_" + idx + (rep ? "_kopie" : "");
                }
            }
        }
        var c = comp("M05b_Logo_Wand", 10);
        ctrl(c, [["Tempo px/s", 120]]);
        var y = H * 0.71;
        proofPill(c, y - 175);
        var panel = grafRect(c, "PANEL_GLAS", 860, 250, 36, GRAF.glass, 85, "#FFFFFF", 1);
        grafTr(panel, "ADBE Position").setValue([W / 2, y]);
        grafInAnim(panel, "0", 0.3, 20, 94);
        var matte = grafRect(c, "PANEL_MATTE", 860, 250, 36, "#FFFFFF", 100);
        grafTr(matte, "ADBE Position").setValue([W / 2, y]);
        var sl = c.layers.add(strip);
        sl.name = "LOGOS_LAUF";
        sl.moveAfter(matte);
        grafTr(sl, "ADBE Position").expression =
            "var x=(time*" + S("Tempo px/s") + ")%" + stripW + ";" +
            "[" + (W / 2 - 430 + stripW) + "-x, " + y + "];";
        sl.trackMatteType = TrackMatteType.ALPHA;
        grafInAnim(sl, "0.1", 0.3, 0, 100);
        built.push({ comp: c, mogrt: false });
    })();

    // =================================================================
    // M06 KARUSSELL  -  9:16-Karten laufen hinter der Person durch (AE)
    //   Person freistellen: Footage duplizieren, Rotopinsel, darueberlegen.
    // =================================================================
    (function () {
        var cw = 370, ch = 660, gap = 28, n = 7;
        var c = comp("M06_Karten_Karussell", 10);
        ctrl(c, [["Tempo px/s", 160]]);
        var track = c.layers.addNull(10);
        track.name = "KARTEN_TRACK";
        grafTr(track, "ADBE Position").expression =
            "var t=time-inPoint; [thisComp.width+200 - easeOut(t,0,0.6,0,600) - t*" + S("Tempo px/s") + ", thisComp.height*0.24];";
        for (var i = 0; i < n; i++) {
            var card = comp("KARTE_" + (i + 1), 10, fSub, cw, ch);
            var ph = card.layers.addSolid([0.18, 0.18, 0.18], "HIER CLIP EINSETZEN", cw, ch, 1, 10);
            grafText(card, "CLIP " + (i + 1), GRAF.fontLabel, 40, WHITE, [cw / 2, ch / 2], 0);
            var mt = grafRect(card, "RUNDE_ECKEN", cw, ch, 26, "#FFFFFF", 100);
            grafTr(mt, "ADBE Position").setValue([cw / 2, ch / 2]);
            // Matte ueber Platzhalter, Platzhalter nutzt Alpha-Matte
            mt.moveBefore(ph);
            ph.trackMatteType = TrackMatteType.ALPHA;
            var cl = c.layers.add(card);
            cl.parent = track;
            grafTr(cl, "ADBE Position").setValue([i * (cw + gap), 0]);
            grafInAnim(cl, "" + (i * 0.06), 0.3, 0, 96);
        }
        built.push({ comp: c, mogrt: false });
    })();

    // =================================================================
    // M07 BOTTOM-SHADE  -  dunkler Verlauf unten (Lesbarkeit Proof/Logos)
    // =================================================================
    (function () {
        var c = comp("M07_Bottom_Shade", 10);
        c.motionGraphicsTemplateName = "GRAF Verlauf unten";
        ctrl(c, [["Deckkraft", 85]]);
        var s = c.layers.addSolid([0, 0, 0], "VERLAUF", W, H, 1, 10);
        var m = s.property("ADBE Mask Parade").addProperty("ADBE Mask Atom");
        var sh = new Shape();
        sh.vertices = [[-100, H * 0.62], [W + 100, H * 0.62], [W + 100, H + 400], [-100, H + 400]];
        sh.closed = true;
        m.property("ADBE Mask Shape").setValue(sh);
        m.property("ADBE Mask Feather").setValue([0, 520]);
        grafTr(s, "ADBE Opacity").expression = "linear(time-inPoint,0,0.4,0," + S("Deckkraft") + ");";
        exposeCtrl(c, [["Deckkraft", "Deckkraft"]]);
        built.push({ comp: c, mogrt: true });
    })();

    // =================================================================
    // M08 TRANSITION  -  Light-Leak von unten + Weissblitz + Glitch-Balken
    //   (Referenz 0:16.0-0:16.4). Mittig ueber den Schnitt legen.
    // =================================================================
    (function () {
        var c = comp("M08_Transition_LightLeak", 0.6);
        c.motionGraphicsTemplateName = "GRAF Transition Light-Leak";
        ctrl(c, []);
        var leak = c.layers.addSolid(grafHex(GRAF.accent), "LEAK", W, H, 1, 0.6);
        var m = leak.property("ADBE Mask Parade").addProperty("ADBE Mask Atom");
        var sh = new Shape();
        sh.vertices = [[-200, H * 0.55], [W + 200, H * 0.55], [W + 200, H + 600], [-200, H + 600]];
        sh.closed = true;
        m.property("ADBE Mask Shape").setValue(sh);
        m.property("ADBE Mask Feather").setValue([0, 700]);
        grafTr(leak, "ADBE Position").expression = "[value[0], value[1]+linear(time,0,0.3,900,-900)];";
        grafTr(leak, "ADBE Opacity").expression = "time<0.3?linear(time,0,0.12,0,85):linear(time,0.3,0.42,85,0);";
        try { grafFx(leak, "ADBE Fill", "Farbe").property("ADBE Fill-0002").expression = ACC + ";"; } catch (e) {}
        leak.blendingMode = BlendingMode.SCREEN;

        var flash = c.layers.addSolid([1, 0.98, 0.95], "WEISSBLITZ", W, H, 1, 0.6);
        grafTr(flash, "ADBE Opacity").expression = "time<0.16?linear(time,0.06,0.16,0,95):linear(time,0.16,0.32,95,0);";

        var bar = c.layers.addSolid(grafHex(GRAF.accent), "GLITCH_BALKEN", 90, H, 1, 0.6);
        try { grafFx(bar, "ADBE Fill", "Farbe").property("ADBE Fill-0002").expression = ACC + ";"; } catch (e) {}
        grafFx(bar, "ADBE Gaussian Blur 2", "Weich").property(1).setValue(25);
        grafTr(bar, "ADBE Position").expression = "[linear(time,0.22,0.42,thisComp.width*0.75,thisComp.width*0.25), value[1]];";
        grafTr(bar, "ADBE Opacity").expression = "time>0.22&&time<0.44?100:0;";
        bar.blendingMode = BlendingMode.ADD;

        exposeCtrl(c, [["Akzent", "Akzentfarbe"]]);
        built.push({ comp: c, mogrt: true });
    })();

    // =================================================================
    // M09 CTA-BUTTON  -  Glas-Pille, umlaufender Glow (Trim Paths)
    // =================================================================
    (function () {
        var c = comp("M09_CTA_Button", 10);
        c.motionGraphicsTemplateName = "GRAF CTA-Button";
        ctrl(c, [["Glow ab (s)", 0.8], ["Glow-Tempo", 140], ["Hoehe %", GRAF.ctaY * 100]]);
        var root = c.layers.addNull(10);
        root.name = "CTA";
        grafTr(root, "ADBE Position").expression = "[thisComp.width/2, thisComp.height*" + S("Hoehe %") + "/100];";
        grafInAnim(root, "0", 0.25, 0, 90);
        var bw = 660, bh = 118;
        var base = grafRect(c, "CTA_GLAS", bw, bh, 59, GRAF.glass, 80, GRAF.accent, 2);
        base.parent = root; grafTr(base, "ADBE Position").setValue([0, 0]);
        grafShapeStroke(base).expression = ACC + ";";
        grafTr(base, "ADBE Opacity").expression = "linear(time-inPoint,0,0.15,0,100);";

        function trace(name, sw, blur) {
            // Reihenfolge wichtig: Rechteck -> Trim Paths -> Kontur
            var l = grafRect(c, name, bw, bh, 59, null, 0, null, 0);
            l.parent = root; grafTr(l, "ADBE Position").setValue([0, 0]);
            var tr = grafShapeContents(l).addProperty("ADBE Vector Filter - Trim");
            tr.property("ADBE Vector Trim Start").setValue(0);
            tr.property("ADBE Vector Trim End").setValue(24);
            grafShapeContents(l).property("ADBE Vector Filter - Trim").property("ADBE Vector Trim Offset").expression =
                "(time-inPoint)*" + S("Glow-Tempo") + ";";
            var st = grafShapeContents(l).addProperty("ADBE Vector Graphic - Stroke");
            st.property("ADBE Vector Stroke Width").setValue(sw);
            grafShapeStroke(l).expression = ACC + ";";
            grafTr(l, "ADBE Opacity").expression = "linear(time-inPoint," + S("Glow ab (s)") + "," + S("Glow ab (s)") + "+0.3,0,100);";
            if (blur) { grafFx(l, "ADBE Gaussian Blur 2", "Glow").property(1).setValue(blur); l.blendingMode = BlendingMode.ADD; }
            return l;
        }
        trace("CTA_TRACE", 4, 0);
        trace("CTA_GLOW", 10, 22);

        var tx = grafText(c, GRAF.ctaText, GRAF.fontCaption, 44, WHITE, [0, 15], -10);
        tx.name = "CTA_TEXT"; tx.parent = root; grafTr(tx, "ADBE Position").setValue([0, 15]);
        grafInAnim(tx, "0.05", 0.22, 14, 100);
        exposeText(c, tx, "CTA-Text");
        exposeCtrl(c, [["Akzent", "Akzentfarbe"], ["Hoehe %", "Hoehe (% Bild)"], ["Glow ab (s)", "Glow ab (s)"]]);
        built.push({ comp: c, mogrt: true });
    })();

    // =================================================================
    // MASTER  -  9:16 Timeline mit Safe-Zones (Guide-Layer)
    // =================================================================
    (function () {
        var c = comp("GRAF_Reel_MASTER", 60, fMaster);
        var g = c.layers.addShape();
        g.name = "SAFE_ZONES (Guide)";
        var zones = [[W / 2, 110, W, 220], [W / 2, H - 210, W, 420], [W - 70, H / 2, 140, H]];
        for (var i = 0; i < zones.length; i++) {
            var grp = g.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
            var gc = g.property("ADBE Root Vectors Group").property(i + 1).property("ADBE Vectors Group");
            var r = gc.addProperty("ADBE Vector Shape - Rect");
            r.property("ADBE Vector Rect Size").setValue([zones[i][2], zones[i][3]]);
            r.property("ADBE Vector Rect Position").setValue([zones[i][0] - W / 2, zones[i][1] - H / 2]);
            var f = g.property("ADBE Root Vectors Group").property(i + 1).property("ADBE Vectors Group").addProperty("ADBE Vector Graphic - Fill");
            f.property("ADBE Vector Fill Color").setValue([1, 0, 0.3, 1]);
            f.property("ADBE Vector Fill Opacity").setValue(22);
        }
        g.guideLayer = true;
        var note = grafText(c, "Instagram-UI: hier keine Texte/CTAs", "ArialMT", 30, [1, 1, 1], [W / 2, H - 120], 0);
        note.guideLayer = true;
        // Footage-Platzhalter mit Zoom-Rig
        var fp = c.layers.addSolid([0.25, 0.25, 0.27], "FOOTAGE_A-ROLL (ersetzen)", W, H, 1, 60);
        fp.moveToEnd();
    })();

    app.endUndoGroup();

    // ---------- optional: MOGRT-Export fuer Premiere ----------
    var doExport = confirm("Frame gebaut.\n\nJetzt die Premiere-Vorlagen (.mogrt) exportieren?\n(Projekt wird dafuer gespeichert.)");
    if (doExport) {
        var out = Folder.selectDialog("Zielordner fuer Projekt + .mogrt waehlen");
        if (out) {
            var aep = new File(out.fsName + "/GRAF_Reel_Frame.aep");
            proj.save(aep);
            var mf = new Folder(out.fsName + "/mogrt"); if (!mf.exists) mf.create();
            var ok = [], fail = [];
            for (var i = 0; i < built.length; i++) {
                if (!built[i].mogrt) continue;
                var c = built[i].comp;
                try {
                    var res = c.exportAsMotionGraphicsTemplate(true, mf.fsName + "/" + c.name + ".mogrt");
                    (res === false ? fail : ok).push(c.name);
                } catch (e) { fail.push(c.name + " (" + e.toString() + ")"); }
            }
            alert("MOGRT-Export\n\nOK: " + ok.join(", ") + (fail.length ? "\n\nFehler: " + fail.join(", ") : ""));
        }
    }
})();
