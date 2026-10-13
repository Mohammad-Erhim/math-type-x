/** Editor stylesheet (scoped under .wrs_editor, NFR-004). Values follow SRS Appendix H / the measured reference. */
import skin from '../data/skin.json';
import { ARABIC_FONTS } from '../layout/arfonts';

export const CSS = `
.wrs_editor{position:relative;width:725px;height:415px;margin:0;padding:0;font:16px sans-serif;color:#000;background:transparent;text-align:left;direction:ltr;line-height:normal;overflow:visible;-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent}
.wrs_editor *,.wrs_editor *::before,.wrs_editor *::after{box-sizing:border-box}
.wrs_editor button{font:inherit;color:inherit;margin:0;padding:0;border:0;background:none;cursor:pointer;outline:0;appearance:none;-webkit-appearance:none}
.wrs_editor{color-scheme:only light}
.wrs_editor svg{display:block}
.wrs_toolbar{position:absolute;left:0;top:0;width:725px;height:97px;font-size:11px;font-weight:400}
.wrs_header{position:absolute;left:0;top:1px;width:725px;height:25px;z-index:2}
.wrs_header>button[role=tab]{position:absolute;top:3px;width:44px;height:21px;border:0;border-radius:0;background:url(${skin.tab}) no-repeat 0 0;cursor:default;overflow:hidden}
.wrs_header>button[role=tab]:hover{background-image:url(${skin.tabHover})}
.wrs_header>button[role=tab] .wrs_imageContainer{position:absolute;left:7px;top:1px;width:30px;height:20px;pointer-events:none}
.wrs_header>button[role=tab].wrs_context{background-image:url(${skin.ctx})}
.wrs_header>button[role=tab].wrs_context:hover{background-image:url(${skin.ctxHover})}
.wrs_header>button[role=tab].wrs_selected{top:0;height:25px;background-image:url(${skin.tabSel});z-index:3}
.wrs_header>button[role=tab].wrs_selected.wrs_context{background-image:url(${skin.ctxSel})}
.wrs_header>button[role=tab].wrs_selected .wrs_imageContainer{top:2px}
.wrs_header>button[role=tab]:focus-visible{outline:2px solid #ffcc00;outline-offset:-3px}
/* the contextual tab when the caret has nothing to offer: greyed out, the panel too */
.wrs_header>button[role=tab].wrs_disabledTab{opacity:.45;filter:grayscale(1);cursor:default}
.wrs_header>button[role=tab].wrs_disabledTab:hover{background-image:url(${skin.ctx})}
.wrs_panelContainer.wrs_ctxEmpty{filter:grayscale(1);opacity:.6}
.wrs_panelContainer{position:absolute;left:0;top:25px;width:725px;height:72px;border:1px solid #778e9a;border-radius:0 0 5px 5px;z-index:1;overflow:hidden;background:url(${skin.panel}) no-repeat 0 0}
.wrs_multipleRowPanel{position:absolute;left:2px;top:2px;width:719px;height:66px;display:none}
.wrs_multipleRowPanel.wrs_selected{display:block}
.wrs_editor button.wrs_button,.wrs_editor .wrs_button{position:absolute;display:block;border:2px solid transparent;border-radius:0;background:transparent;overflow:hidden;padding:0;margin:0}
.wrs_button svg{pointer-events:none}
.wrs_editor .wrs_button:hover,.wrs_editor .wrs_button:focus,.wrs_editor .wrs_button.wrs_pressed{border-color:#778e9a;border-radius:3px;box-shadow:0 0 10px rgba(52,64,84,.2)}
.wrs_editor .wrs_button:focus{box-shadow:none}
.wrs_editor .wrs_button.wrs_toggled{background:url(${skin.btnSmallActive}) no-repeat -2px -2px;border-color:transparent;border-radius:0}
.wrs_editor .wrs_button.wrs_toggled:hover,.wrs_editor .wrs_button.wrs_toggled:focus{border-color:#778e9a;border-radius:3px}
.wrs_editor .wrs_button.wrs_small:active:not(.wrs_disabled){background:url(${skin.btnSmallActive}) no-repeat -2px -2px}
.wrs_editor .wrs_button.wrs_big:active:not(.wrs_disabled){background:url(${skin.btnActive}) no-repeat -2px -2px}
.wrs_editor .wrs_button.wrs_disabled{cursor:default;opacity:.45}
.wrs_editor .wrs_button.wrs_disabled:hover{border-color:transparent;background:none;box-shadow:none}
.wrs_editor .wrs_button.wrs_disabled:focus{outline:2px solid rgba(119,142,154,.3)}
.wrs_line{position:absolute;display:block;width:1px;height:60px;background:#bbbdbe}
.wrs_expandButton{position:absolute;width:7px;height:60px;border:0;border-radius:2px;background:transparent;padding:0}
.wrs_expandButton::after{content:"";position:absolute;left:2px;top:50px;width:0;height:0;border-style:solid;border-width:3.5px 0 3.5px 3px;border-color:transparent transparent transparent #b1b3b4}
.wrs_expandButton:hover,.wrs_expandButton:focus,.wrs_expandButton.wrs_pressed,.wrs_expandButton[aria-expanded=true]{background:#778e9a;box-shadow:0 0 10px rgba(52,64,84,.2);outline:0}
.wrs_expandButton:focus{box-shadow:none}
.wrs_expandButton:hover::after,.wrs_expandButton:focus::after,.wrs_expandButton.wrs_pressed::after,.wrs_expandButton[aria-expanded=true]::after{border-left-color:#fff}
.wrs_select{position:absolute;width:73px;height:18px;border:1px solid #b1b3b4;border-radius:0;background:url(${skin.selBg}) no-repeat 100% 50%;overflow:hidden;box-sizing:border-box;font:700 11px sans-serif}
.wrs_select .wrs_label{position:absolute;left:0;top:0;width:71px;height:18px;line-height:18px;padding:0 15px 0 5px;box-sizing:border-box;text-overflow:ellipsis;font-size:11px;font-weight:700;color:#b1b3b4;white-space:nowrap;overflow:hidden;pointer-events:none}
.wrs_select select{position:absolute;left:0;top:0;width:100%;height:100%;opacity:0;cursor:pointer;font-size:12px}
.wrs_select.wrs_active .wrs_label{color:#3b4a53}
.wrs_select .wrs_label.wrs_arabicFont{font-size:13px;font-weight:400;direction:rtl;text-align:left}
.wrs_select option[data-arabic]{font-size:15px}
.wrs_editor .wrs_button.wrs_toggled.wrs_big{background:url(${skin.btnActive}) no-repeat -2px -2px;border-color:transparent;border-radius:0}
.wrs_editor .wrs_button.wrs_toggled.wrs_small{background:url(${skin.btnSmallActive}) no-repeat -2px -2px;border-color:transparent;border-radius:0}
.wrs_editor .wrs_button.wrs_big.wrs_disabled svg,.wrs_editor .wrs_button.wrs_small.wrs_disabled svg{opacity:.3}
.wrs_editor .wrs_button.wrs_big.wrs_disabled,.wrs_editor .wrs_button.wrs_small.wrs_disabled{opacity:1}
.wrs_select.wrs_ctxSelect{border-radius:0;background:url(${skin.selBg}) no-repeat 100% 50%;overflow:hidden;box-sizing:border-box;font:700 11px sans-serif}
.wrs_select.wrs_ctxSelect::after{display:none}
.wrs_select.wrs_ctxSelect .wrs_label{position:static;left:auto;top:auto;width:auto;height:18px;line-height:16px;padding:0 15px 0 5px;text-indent:0;color:#b1b3b4;font:700 11px/16px sans-serif}
.wrs_select.wrs_ctxSelect select{left:0;top:0;width:100%;height:100%}
.wrs_lengthButtonPanel{position:absolute;z-index:6;box-sizing:border-box;padding:1px;border:1px solid #b1b3b4;background:#edf2f4;font:700 11px sans-serif;color:#778e9a;white-space:nowrap}
.wrs_lengthButtonPanel table{border:0;border-collapse:separate;border-spacing:1px}
.wrs_lengthButtonPanel td{padding:0;text-align:left}
.wrs_lengthButtonPanel tr:first-child td{padding-bottom:5.5px}
.wrs_lengthButtonPanel .wrs_inputCell input{box-sizing:border-box;width:70px;height:16px;margin:0 0 0 5px;padding:1px;border:1px solid #b1b3b4;border-radius:10px;background:#fff;font:700 11px sans-serif;color:#000;outline:0}
.wrs_formulaDisplayWrapper{position:absolute;left:0;top:99px;width:695px;height:316px;overflow:auto}
.wrs_formulaDisplay{position:relative;width:695px;height:316px;border:1px solid #969696;background:#fff;overflow:auto;cursor:text;font-size:16px}
.wrs_formulaContent{position:relative;margin:5px;min-width:1px;min-height:1px}
.wrs_formulaSvg svg{overflow:visible}
.wrs_caret{position:absolute;width:0;border-left:1px solid #000;z-index:3;pointer-events:none}
.wrs_caret.wrs_dark{border-left-color:#000}
.wrs_caret.wrs_light{border-left-color:#fff}
.wrs_underlineCaret{position:absolute;height:0;border-bottom:1px solid #000;opacity:.5;pointer-events:none}
.wrs_selection{position:absolute;background:#c3c3c3;pointer-events:none}
.wrs_editctx{position:absolute;background:#cddce3;pointer-events:none}
.wrs_focusElementContainer{position:absolute;left:0;top:0;width:1px;height:1px;overflow:hidden}
.wrs_focusElement{position:absolute;left:0;top:0;width:1px;height:1px;opacity:0;border:0;padding:0;margin:0;background:transparent;color:transparent;caret-color:transparent;font-size:16px}
.wrs_ariaLiveRegion{position:absolute;left:-9999px;top:0;width:1px;height:1px;overflow:hidden}
.wrs_hiddenButDisplayed{clip-path:inset(50%)}
.wrs_clipboardTextarea{position:absolute;left:-9999px;top:0;width:1px;height:1px;opacity:0}
.wrs_scaled{height:calc(415px + (var(--wrs-k) - 1) * 97px)}
.wrs_scaled .wrs_toolbar.wrs_main{zoom:var(--wrs-k)}
.wrs_scaled .wrs_formulaDisplayWrapper,.wrs_scaled .wrs_handWrapper{top:calc(99px + (var(--wrs-k) - 1) * 97px)}
.wrs_scaled .wrs_popup,.wrs_scaled .wrs_panel{zoom:var(--wrs-k)}
.wrs_noHand .wrs_handWrapper{display:none}
.wrs_noHand .wrs_formulaDisplay,.wrs_noHand .wrs_formulaDisplayWrapper{width:725px}
.wrs_handWrapper{position:absolute;left:697px;top:99px;width:28px;height:316px;box-sizing:border-box;border:1px solid #4f5e66;background:#778e9a;overflow:hidden}
.wrs_handWrapper .wrs_handStrip{position:absolute;left:-1px;top:-1px;width:30px;height:316px;cursor:pointer}
.wrs_handWrapper .wrs_handStrip svg{position:absolute;left:-1px;top:0}
.wrs_handWrapper input[type=button]{position:absolute;left:-1px;top:-1px;width:28px;height:316px;opacity:0;cursor:pointer;margin:0;padding:0;border:0}
.wrs_handWrapper input[type=button]:focus-visible{opacity:1;background:rgba(255,255,255,.25);outline:2px solid #fff;outline-offset:-3px}
.wrs_popup{position:absolute;z-index:20;padding:2px;background:#f3f5f6 url(${skin.bodyBg}) no-repeat 0 100%;background-size:auto 100%;border:1px solid #778e9a;border-radius:0 0 5px 5px}
.wrs_popup.wrs_periodic::before{content:"";position:absolute;left:1px;top:1px;width:399px;height:200px;background:url(${skin.periodic}) no-repeat 50% 50%;background-size:100% 100%;pointer-events:none}
.wrs_popup .wrs_button{position:absolute}
.wrs_dialog{position:absolute;z-index:30;background:#ebeff2;border:1px solid #a9b4bb;font-size:12px;font-weight:700;color:#778e9a}
.wrs_dialog label{position:absolute;white-space:nowrap}
.wrs_dialog input,.wrs_dialog select{font:700 12px sans-serif;color:#000}
.wrs_colorButton{position:absolute;width:13px;height:13px;border:1px solid #a3a3a3;cursor:pointer}
.wrs_colorButton:hover,.wrs_colorButton.wrs_focused{outline:2px solid #778e9a;outline-offset:0}
.wrs_hand{position:absolute;left:0;top:0;width:725px;height:415px;background:#fff;display:none;z-index:40}
.wrs_hand .wrs_toolbar{position:absolute;left:0;top:0;width:39px;height:415px;background:#e6edf0;border-right:1px solid #778e9a}
.wrs_hand .wrs_button{position:absolute;left:3px;width:33px;height:33px}
.wrs_hand .wrs_key2edit{position:absolute;left:0;bottom:0;width:39px;height:39px;margin:0;padding:0;border:0;background:#4e5861 url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='39' height='39' viewBox='0 0 39 39'%3E%3Crect x='8.5' y='11.5' width='23' height='16' fill='%23fff'/%3E%3Cg fill='%234e5861'%3E%3Crect x='10.5' y='13.5' width='3' height='3'/%3E%3Crect x='14.5' y='13.5' width='3' height='3'/%3E%3Crect x='18.5' y='13.5' width='3' height='3'/%3E%3Crect x='22.5' y='13.5' width='3' height='3'/%3E%3Crect x='26.5' y='13.5' width='3' height='3'/%3E%3Crect x='10.5' y='17.5' width='3' height='3'/%3E%3Crect x='14.5' y='17.5' width='3' height='3'/%3E%3Crect x='18.5' y='17.5' width='3' height='3'/%3E%3Crect x='22.5' y='17.5' width='3' height='3'/%3E%3Crect x='26.5' y='17.5' width='3' height='3'/%3E%3Crect x='14.5' y='22.5' width='11' height='3'/%3E%3C/g%3E%3C/svg%3E") no-repeat center;cursor:pointer;appearance:none;-webkit-appearance:none}
.wrs_hand .wrs_canvasContainer{position:absolute;left:41px;top:0;width:684px;height:415px;background:#fff;touch-action:none;border-left:1px solid #969696;border-top:1px solid #969696;box-shadow:inset 3px 3px 5px -2px rgba(150,150,150,.5)}
.wrs_hand canvas{position:absolute;left:0;top:0;width:684px;height:415px;touch-action:none;cursor:crosshair;background:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAABmJLR0QAAAAAAAD5Q7t/AAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH3wcPDQ0P6DY4kwAAAB1pVFh0Q29tbWVudAAAAAAAQ3JlYXRlZCB3aXRoIEdJTVBkLmUHAAAAKklEQVQ4y2NgoCKYNm1aPRMDlcGogaMGjho4auCogTQykHHatGn11DQQAMKqBKjiJFgoAAAAAElFTkSuQmCC) 0 0 repeat}
.wrs_hand .wrs_button svg{position:absolute;left:0;top:0}
.wrs_hand .wrs_line{background:#bbbdbe}
.wrs_hand .wrs_helpText{position:absolute;left:0;right:0;top:60%;text-align:center;font:18px Arial,sans-serif;color:#425a66;pointer-events:none}
.wrs_hand .wrs_helpBrand{margin-top:8px;font-size:12px;color:#778e9a}
.wrs_handMode .wrs_hand{display:block}
.wrs_handMode .wrs_toolbar.wrs_main,.wrs_handMode .wrs_formulaDisplayWrapper,.wrs_handMode .wrs_handWrapper{visibility:hidden}
.wrs_panel{position:absolute;z-index:30;background:#edf2f4;border:1px solid #b1b3b4;color:#778e9a;font:700 11px Arial,sans-serif;box-sizing:border-box}
.wrs_panel table{border-collapse:separate;border-spacing:0;border:0;margin:0;padding:0}
.wrs_panel td{padding:0;vertical-align:middle}
.wrs_panel input,.wrs_panel select{font:700 11px Arial,sans-serif;color:#000;background:#fff;border:1px solid #b1b3b4;border-radius:10px;outline:0;margin:0;box-sizing:border-box}
.wrs_panel input:focus{border-color:#000;box-shadow:0 0 0 1px #000}
.wrs_matrixButtonPanel{width:101px;height:124px}
.wrs_matrixButtonPanel>table{position:absolute;left:2px;border-spacing:1px}
.wrs_matrixButtonPanel>table:first-child{top:2px}
.wrs_matrixButtonPanel>table:first-child td{width:15px;height:13px;padding:0}
.wrs_matrixButtonPanel .wrs_matrixButton{width:13px;height:13px;border:1px solid #b1b3b4;background:#fff;cursor:pointer}
.wrs_matrixButtonPanel .wrs_matrixButton.wrs_selected{background:#ffcc00;border-color:#8c7600}
.wrs_matrixButtonPanel>table:last-child{top:87px}
.wrs_matrixButtonPanel>table:last-child td{height:16px;padding:0}
.wrs_matrixButtonPanel>table:last-child td:first-child{width:56px}
.wrs_matrixButtonPanel .wrs_inputCell{width:38px}
.wrs_matrixButtonPanel .wrs_inputCell input{width:35px;height:16px;padding:0 3px;margin-left:3px;display:block}
.wrs_colorChooserPanel{width:102px;height:118px}
.wrs_colorChooserPanel>table{position:absolute;left:1px;top:1px;padding:5px}
.wrs_colorChooserPanel td{width:18px;height:18px}
.wrs_colorChooserPanel .wrs_colorButton{position:static;width:13px;height:13px;border:1px solid #b1b3b4;cursor:pointer;box-sizing:border-box}
.wrs_colorChooserPanel>div{position:absolute;left:1px;top:96px;width:100px;height:21px;padding-left:5px;line-height:16px;white-space:nowrap}
.wrs_colorChooserPanel>div input{position:absolute;left:45px;top:0;width:50px;height:16px;padding:0 4px}
.wrs_unicodeChooserPanel{width:225px;height:206px}
.wrs_unicodeChooserPanel>div:first-child{position:absolute;left:9px;top:9px;width:207px;height:38px;line-height:16px;white-space:nowrap}
.wrs_unicodeChooserPanel>div:first-child input{position:absolute;left:39px;top:6px;width:65px;height:16px;padding:0 4px}
.wrs_unicodeChooserPanel>div:first-child select{position:absolute;left:0;top:0;width:100%;height:30px;padding:0 6px;border-color:#8992a4}
.wrs_unicodeChooserTableContainer{position:absolute;left:9px;top:47px;width:207px;height:150px;overflow-x:hidden;overflow-y:auto}
.wrs_unicodeChooserPanel.wrs_zulfiMode{width:min(350px,calc(100vw - 24px));height:330px;max-width:100%}
.wrs_zulfiMode>div:first-child{width:calc(100% - 18px)!important;height:38px!important}
.wrs_zulfiMode>div:first-child select{width:100%!important;height:32px!important}
.wrs_zulfiMode .wrs_unicodeChooserTableContainer{top:52px;width:calc(100% - 18px);height:246px}
.wrs_zulfiMode .wrs_unicodeTable td{padding:0}
.wrs_unicodeTable td{width:17px;height:17px;background:#fff;border-right:1px solid #ddd;border-bottom:1px solid #ddd}
.wrs_zulfiButton svg{display:block;margin:auto}
.wrs_unicodeButton{width:16px;height:16px;line-height:16px;overflow:hidden;text-align:center;font:700 13px 'STIX Two Math',serif;color:#778e9a;cursor:pointer;overflow:hidden}
.wrs_unicodeButton:hover,.wrs_unicodeButton:focus{background:#ffcc00;color:#000;outline:0}
.wrs_unicodeButton.wrs_zulfiButton{width:40px;height:40px;line-height:0;display:flex;align-items:center;justify-content:center;color:#18212f;overflow:visible}
.wrs_caretPrecisionController{position:absolute;touch-action:none;z-index:6}
.wrs_caretPrecisionController.wrs_forSelection{width:24px;height:36px}
.wrs_snackbar{position:absolute;left:10px;bottom:10px;padding:6px 10px;background:#333;color:#fff;font:12px sans-serif;border-radius:3px}
.wrs_hidden{display:none!important}
/* fluid layout (narrow containers, touch): the widget fills its container, the toolbar is a pair of scrolling strips at touch size */
.wrs_editor{touch-action:manipulation}
.wrs_editor.wrs_fluid{width:100%;height:100%;min-width:0;min-height:240px;display:flex;flex-direction:column;overflow:hidden;--wrs-strip:44px}
.wrs_fluid .wrs_toolbar.wrs_main{position:relative;left:auto;top:auto;flex:none;width:100%;height:auto;display:flex;flex-direction:column}
.wrs_fluid .wrs_header{position:relative;left:auto;top:auto;flex:none;width:calc(100% - 26px * var(--wrs-k));height:calc(25px * var(--wrs-k));overflow-x:auto;overflow-y:hidden;scrollbar-width:none;-webkit-overflow-scrolling:touch}
.wrs_fluid .wrs_header::-webkit-scrollbar,.wrs_fluid .wrs_panelContainer::-webkit-scrollbar{display:none}
.wrs_fluid .wrs_header>button[role=tab]{zoom:var(--wrs-k)}
.wrs_fluid .wrs_panelContainer{position:relative;left:auto;top:auto;flex:none;width:100%;height:calc(72px * var(--wrs-k));overflow-x:auto;overflow-y:hidden;overscroll-behavior-x:contain;scrollbar-width:none;-webkit-overflow-scrolling:touch;background:url(${skin.panel}) no-repeat 0 0 / auto 100%,url(${skin.panel}) no-repeat 100% 0 / 20000% 100%,linear-gradient(#f6f9fa,#e3eaed)}
.wrs_fluid .wrs_multipleRowPanel{zoom:var(--wrs-k)}
.wrs_fluid .wrs_formulaDisplayWrapper{position:relative;left:auto;top:auto;flex:1 1 0;width:auto;height:auto;min-height:0;margin-right:var(--wrs-strip)}
.wrs_fluid .wrs_formulaDisplay{width:100%;height:100%;font-size:16px}
.wrs_fluid.wrs_noHand .wrs_formulaDisplayWrapper{margin-right:0}
.wrs_fluid.wrs_noHand .wrs_formulaDisplay{width:100%}
.wrs_fluid .wrs_handWrapper{left:auto;right:0;top:calc(25px * var(--wrs-k) + 72px * var(--wrs-k));bottom:0;width:var(--wrs-strip);height:auto;border:0}
.wrs_fluid .wrs_handWrapper .wrs_handStrip{left:0;top:0;width:100%;height:100%}
.wrs_fluid .wrs_handWrapper .wrs_handStrip svg{position:absolute;left:50%;top:50%;margin-left:-15px;margin-top:-158px}
.wrs_fluid .wrs_handWrapper input[type=button]{left:0;top:0;width:100%;height:100%}
.wrs_fluid .wrs_popup,.wrs_fluid .wrs_panel,.wrs_fluid .wrs_lengthButtonPanel{zoom:var(--wrs-k);max-width:calc(100% / var(--wrs-k))}
.wrs_fluid .wrs_panel input,.wrs_fluid .wrs_panel select,.wrs_fluid .wrs_lengthButtonPanel input{font-size:16px}
.wrs_fluid .wrs_snackbar{left:8px;right:8px;bottom:calc(8px + env(safe-area-inset-bottom,0px))}
.wrs_fluid .wrs_hand{width:100%;height:100%}
.wrs_fluid .wrs_hand .wrs_toolbar{height:100%;zoom:var(--wrs-hk)}
.wrs_fluid .wrs_hand .wrs_canvasContainer{left:calc(41px * var(--wrs-hk));right:0;bottom:0;width:auto;height:auto}
.wrs_fluid .wrs_hand canvas{width:100%;height:100%}
.wrs_fluid .wrs_hand .wrs_helpText{font-size:16px;padding:0 12px}
/* narrow windows: no sideways scrolling – one row of tabs, the controls of a tab wrap into rows */
.wrs_reflow .wrs_header{width:calc(100% - 26px * var(--wrs-k));height:40px;display:flex;overflow:visible;gap:1px}
.wrs_reflow .wrs_header>button[role=tab]{position:relative;left:auto!important;top:auto;zoom:1;flex:1 1 0;min-width:0;width:auto;height:36px;background-size:100% 100%;margin-top:3px}
.wrs_reflow .wrs_header>button[role=tab].wrs_selected{top:auto;height:40px;margin-top:0;background-size:100% 100%}
.wrs_reflow .wrs_header>button[role=tab] .wrs_imageContainer,.wrs_reflow .wrs_header>button[role=tab].wrs_selected .wrs_imageContainer{left:50%;margin-left:-15px;top:50%;margin-top:-10px}
.wrs_fluid .wrs_toolbar.wrs_main{margin-bottom:10px}
.wrs_tabCaption{display:none}
.wrs_reflow .wrs_tabCaption{display:block;flex:none;padding:3px 10px;background:#e6edf0;border-bottom:1px solid #b7c4cb;color:#324d5b;font:700 12px/16px Arial,sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wrs_hint{display:none;position:absolute;left:34px;right:12px;top:9px;color:#6d7f89;font:15px/1.3 Arial,sans-serif;pointer-events:none;z-index:1;direction:ltr;text-align:left}
.wrs_rtl .wrs_hint{direction:rtl;text-align:right;left:12px;right:34px}
.wrs_emptyDoc .wrs_hint{display:block}
.wrs_handMode .wrs_hint{display:none}
.wrs_sentinel{height:1px;width:1px;margin:0;padding:0;pointer-events:none;visibility:hidden}
/* narrow windows: a short panel that scrolls. Its height follows the window in CSS alone (dvh: a soft keyboard makes it
   shorter in the same frame, without script); the scroll cues say that there is more */
.wrs_reflow .wrs_panelContainer{height:auto;max-height:120px;max-height:clamp(84px,24dvh,120px);overflow-x:hidden;overflow-y:auto;overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:#6f8793 transparent;-webkit-overflow-scrolling:touch;contain:layout paint}
.wrs_reflow .wrs_panelContainer::-webkit-scrollbar{display:block;width:6px}
.wrs_reflow .wrs_panelContainer::-webkit-scrollbar-thumb{background:#6f8793;border-radius:3px}
.wrs_scrollCue{display:none}
.wrs_reflow .wrs_toolbar.wrs_main{position:relative}
.wrs_reflow .wrs_scrollCue{display:flex;position:absolute;left:0;right:6px;height:28px;align-items:center;justify-content:center;gap:4px;margin:0;padding:0;border:0;z-index:4;color:#324d5b;font:700 12px Arial,sans-serif;cursor:pointer;opacity:0;pointer-events:none;transition:opacity .15s}
.wrs_reflow .wrs_cueDown{bottom:1px;background:linear-gradient(rgba(214,224,229,0),rgba(214,224,229,.97) 65%)}
.wrs_reflow .wrs_cueUp{top:var(--wrs-cue-top,66px);background:linear-gradient(rgba(214,224,229,.97) 35%,rgba(214,224,229,0))}
.wrs_reflow.wrs_toolbar.wrs_moreBelow .wrs_cueDown,.wrs_reflow .wrs_toolbar.wrs_moreBelow .wrs_cueDown,.wrs_reflow .wrs_toolbar.wrs_moreAbove .wrs_cueUp{opacity:1;pointer-events:auto}
@media (prefers-reduced-motion:reduce){.wrs_reflow .wrs_scrollCue{transition:none}}
.wrs_reflow .wrs_multipleRowPanel{position:relative;left:auto;top:auto}
.wrs_reflow .wrs_panelContainer.wrs_collapsed{display:none}
.wrs_reflow .wrs_line{display:none}
.wrs_reflow .wrs_expandButton{width:26px;box-sizing:border-box;border:0;border-radius:2px;background:transparent}
.wrs_reflow .wrs_expandButton::after{left:8px;top:calc(50% - 3px);border-width:7px 5px 0 5px;border-color:#51636d transparent transparent transparent}
.wrs_reflow .wrs_expandButton.wrs_pressed,.wrs_reflow .wrs_expandButton[aria-expanded=true]{background:#778e9a;box-shadow:0 0 10px rgba(52,64,84,.2)}
.wrs_reflow .wrs_expandButton.wrs_pressed::after,.wrs_reflow .wrs_expandButton[aria-expanded=true]::after{border-color:#fff transparent transparent transparent}
.wrs_reflow .wrs_expandButton:hover:not(.wrs_pressed):not([aria-expanded=true]),.wrs_reflow .wrs_expandButton:focus:not(.wrs_pressed):not([aria-expanded=true]){background:transparent;box-shadow:none}
.wrs_reflow .wrs_expandButton:hover:not(.wrs_pressed):not([aria-expanded=true])::after,.wrs_reflow .wrs_expandButton:focus:not(.wrs_pressed):not([aria-expanded=true])::after{border-color:#51636d transparent transparent transparent}
.wrs_navPad{display:none;position:absolute;right:38px;top:356px;z-index:6;gap:4px;direction:ltr;touch-action:manipulation;-webkit-user-select:none;user-select:none}
.wrs_touch .wrs_navPad,.wrs_reflow .wrs_navPad,.wrs_fluid .wrs_navPad{display:flex;gap:4px}
.wrs_fluid .wrs_navPad{position:relative;right:auto;top:auto;flex:none;width:100%;box-sizing:border-box;justify-content:flex-end;padding:4px 8px;border-top:1px solid #778e9a;background:linear-gradient(#f6f9fa,#e3eaed)}
/* the pad follows the toolbar's look: slate frame, light blue-grey face, cream when pressed */
.wrs_editor .wrs_navKey{width:48px;flex:0 1 48px;min-width:36px;height:48px;padding:0;border:2px solid #778e9a;border-radius:3px;background:linear-gradient(#f3f6f7,#dde6ea);color:#324d5b;font:700 19px/1 Arial,sans-serif;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
.wrs_editor .wrs_navKey:active{background:linear-gradient(#fffdf2,#f6efd0);border-color:#5f7681}
.wrs_editor .wrs_navKey svg{display:block;margin:0 auto}
.wrs_formulaDisplay{-webkit-touch-callout:none;-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent}
.wrs_editor .wrs_navKey .wrs_navCap{display:block;margin-top:2px;font:700 10px/1 Arial,sans-serif;white-space:nowrap}
.wrs_editor .wrs_navClear{color:#fff}
.wrs_editor .wrs_navKeyboard,.wrs_editor .wrs_navBackspace{color:#324d5b}
@media (max-height:560px){.wrs_editor .wrs_navKey{height:40px;width:44px;flex-basis:44px}.wrs_fluid .wrs_navPad{padding:3px 8px}}
.wrs_rtl .wrs_navBackspace svg{transform:scaleX(-1)}
.wrs_editor .wrs_navKeyboard.wrs_navOn{background:linear-gradient(#5f7681,#3f535c);border-color:#2b3b43;color:#fff;box-shadow:inset 0 0 0 1px rgba(255,255,255,.25)}
@media (pointer:fine),(min-width:720px){.wrs_editor .wrs_navKeyboard{display:none}}
.wrs_fluid .wrs_navPad .wrs_navClear{margin-right:auto}
.wrs_editor .wrs_navKeyboard{margin-right:10px}
.wrs_editor .wrs_navHistory{display:flex;flex-direction:column;align-items:center;justify-content:center;color:#324d5b}
.wrs_editor .wrs_navRedo{margin-right:10px}
.wrs_editor .wrs_navHistory.wrs_navOff{opacity:.4}
.wrs_editor .wrs_navKey{min-width:28px}
@media (max-width:380px){.wrs_fluid .wrs_navPad{gap:3px;padding:3px 4px}.wrs_editor .wrs_navKey .wrs_navCap{font-size:9px;letter-spacing:-.3px}.wrs_editor .wrs_navKeyboard,.wrs_editor .wrs_navRedo{margin-right:6px}}
.wrs_editor .wrs_navClear{margin-right:14px;border-color:#a3221c;background:linear-gradient(#ea5a52,#c62d26)}
.wrs_editor .wrs_navClear:active{background:linear-gradient(#c62d26,#a3221c);border-color:#7d1914}
.wrs_editor .wrs_navClear.wrs_navOff{opacity:.45;background:linear-gradient(#e6a9a5,#d68a85);border-color:#c9908c}
.wrs_editor .wrs_navClear,.wrs_editor .wrs_navKeyboard,.wrs_editor .wrs_navBackspace{display:flex;flex-direction:column;align-items:center;justify-content:center}
.wrs_navClear svg path{stroke:#fff}
.wrs_confirm{display:none;position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:9;width:min(300px,calc(100% - 32px));box-sizing:border-box;padding:16px;border:2px solid #778e9a;border-radius:6px;background:linear-gradient(#f6f9fa,#e3eaed);box-shadow:0 0 0 100vmax rgba(24,33,47,.38),0 6px 22px rgba(24,33,47,.35);font:700 15px/1.4 Arial,sans-serif;color:#324d5b;direction:ltr;text-align:center}
.wrs_confirm.wrs_open{display:flex;flex-wrap:wrap;gap:10px}
.wrs_confirmText{flex:1 1 100%;margin:0 0 4px}
.wrs_editor .wrs_confirm button{flex:1 1 0;height:48px;min-width:0;margin:0;border:2px solid #778e9a;border-radius:3px;background:linear-gradient(#f3f6f7,#dde6ea);font:700 14px Arial,sans-serif;color:#324d5b}
.wrs_editor .wrs_confirm button:active{background:linear-gradient(#fffdf2,#f6efd0)}
.wrs_editor .wrs_confirm .wrs_confirmYes{background:linear-gradient(#ea5a52,#c62d26);border-color:#a3221c;color:#fff}
/* touch devices have no hover: a tapped control must not stay highlighted */
@media (hover:none){
.wrs_editor .wrs_button:focus:not(:focus-visible):not(.wrs_pressed):not(.wrs_toggled){border-color:transparent;border-radius:0;box-shadow:none}
.wrs_editor:not(.wrs_reflow) .wrs_expandButton:focus:not(:focus-visible):not(.wrs_pressed):not([aria-expanded=true]){background:transparent;box-shadow:none}
.wrs_editor .wrs_button:hover:not(.wrs_pressed):not(.wrs_toggled):not(:focus),.wrs_editor:not(.wrs_reflow) .wrs_expandButton:hover:not([aria-expanded=true]):not(:focus){border-color:transparent;background:none;box-shadow:none}
.wrs_header>button[role=tab]:hover:not(.wrs_selected){background-image:url(${skin.tab})}
}
@media (prefers-reduced-motion:reduce){.wrs_hand .wrs_hint{animation:none!important}}
`;

let injected = false;
export function injectStyles(doc: Document = document): void {
  if (injected && doc.getElementById('wrs-editor-style')) return;
  const st = doc.createElement('style');
  st.id = 'wrs-editor-style';
  st.textContent = CSS;
  doc.head.appendChild(st);
  injected = true;
}

/** @font-face rules of the faces bundled with the editor, served from `base` (an absolute or relative directory URL):
 * the formula canvas, the icons and the image exports all draw with these, wherever the editor is embedded */
export function bundledFontCss(base: string): string {
  const b = base.replace(/\/?$/, '/');
  const face = (family: string, file: string, format: string, weight = 400, style = 'normal') =>
    `@font-face{font-family:'${family}';font-style:${style};font-weight:${weight};src:url('${b}${file}') format('${format}');font-display:block}`;
  return [
    face('STIX Two Math', 'stix-two-math.woff2', 'woff2'),
    face('Liberation Sans', 'LiberationSans-Regular.ttf', 'truetype'),
    face('Liberation Sans', 'LiberationSans-Bold.ttf', 'truetype', 700),
    face('Liberation Sans', 'LiberationSans-Italic.ttf', 'truetype', 400, 'italic'),
    face('Liberation Sans', 'LiberationSans-BoldItalic.ttf', 'truetype', 700, 'italic'),
    face('MTX Arabic', 'MtxArabic-Regular.ttf', 'truetype'),
    face('MTX Arabic', 'MtxArabic-Bold.ttf', 'truetype', 700),
    // the Arabic faces of the Font list: declared here, fetched only when a formula (or the list) uses one
    ...ARABIC_FONTS.flatMap((f) => [
      face(f.family, `${f.stem}-Regular.woff2`, 'woff2').replace('font-display:block', 'font-display:swap'),
      face(f.family, `${f.stem}-Bold.woff2`, 'woff2', 700).replace('font-display:block', 'font-display:swap'),
    ]),
  ].join('\n');
}

export const BUNDLED_FACES = ['16px "STIX Two Math"', '16px "Liberation Sans"', 'bold 16px "Liberation Sans"', 'italic 16px "Liberation Sans"', '16px "MTX Arabic"', 'bold 16px "MTX Arabic"'];

export function injectBundledFonts(base: string, doc: Document = document): void {
  if (doc.getElementById('mtx-editor-fonts')) return;
  const st = doc.createElement('style');
  st.id = 'mtx-editor-fonts';
  st.textContent = bundledFontCss(base);
  doc.head.appendChild(st);
}
