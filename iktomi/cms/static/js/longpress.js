/*
 *  Project: Long Press
 *  Description: Pops a list of alternate characters when a key is long-pressed
 *  Original author: Quentin Thiaucourt, http://toki-woki.net
 *  Improved by: SmartTeleMax team
 *  Licence: MIT License http://opensource.org/licenses/mit-license.php
 */

;(function () {

  var document = window.document;

  var moreChars={
    // extended latin (and african latin)
    // upper
    'A':'ĀĂÀÁÂÃÄÅĄⱭ∀Æ',
    'B':'Ɓ',
    'C':'ÇĆĈĊČƆ',
    'D':'ÐĎĐḎƊ',
    'E':'ÈÉÊËĒĖĘẸĚƏÆƎƐ€',
    'F':'ƑƩ',
    'G':'ĜĞĠĢƢ',
    'H':'ĤĦ',
    'I':'ÌÍÎÏĪĮỊİIƗĲ',
    'J':'ĴĲ',
    'K':'ĶƘ',
    'L':'ĹĻĽŁΛ',
    'N':'ÑŃŅŇŊƝ₦',
    'O':'ÒÓÔÕÖŌØŐŒƠƟ',
    'P':'Ƥ¶',
    'R':'ŔŘɌⱤ',
    'S':'ßſŚŜŞṢŠÞ§',
    'T':'ŢŤṮƬƮ',
    'U':'ÙÚÛÜŪŬŮŰŲɄƯƱ',
    'V':'Ʋ',
    'W':'ŴẄΩ',
    'Y':'ÝŶŸƔƳ',
    'Z':'ŹŻŽƵƷẔ',

    // lower
    'a':'āăàáâãäåąɑæαª',
    'b':'ßβɓ',
    'c':'çςćĉċč¢ɔ',
    'd':'ðďđɖḏɖɗ',
    'e':'èéêëēėęẹěəæεɛ€',
    'f':'ƒʃƭ',
    'g':'ĝğġģɠƣ',
    'h':'ĥħɦẖ',
    'i':'ìíîïīįịiiɨĳι',
    'j':'ĵɟĳ',
    'k':'ķƙ',
    'l':'ĺļľłλ',
    'n':'ñńņňŋɲ',
    'o':'òóôõöōøőœơɵ°',
    'p':'ƥ¶',
    'r':'ŕřɍɽ',
    's':'ßſśŝşṣšþ§',
    't':'ţťṯƭʈ',
    'u':'ùúûüūŭůűųưμυʉʊ',
    'v':'ʋ',
    'w':'ŵẅω',
    'y':'ýŷÿɣyƴ',
    'z':'źżžƶẕʒƹ',

    // Misc
    '$':'£¥€₩₨₳Ƀ¤',
    '!':'¡‼‽',
    '?':'¿‽',
    '%':'‰',
    '.':'…••',
    '-':'±‐–—',
    '+':'±†‡',
    '\'':'′″‴‘’‚‛',
    '"':'“”„‟',
    '<':'≤‹',
    '>':'≥›',
    '=':'≈≠≡'

  };
  var ignoredKeys=[8, 13, 37, 38, 39, 40];

  var selectedCharIndex;
  var lastWhich;
  var timer;
  var activeElement;
  var popup;
  var typedChar;
  var cleanupTimeout;

  function cleanUp(){
    // Garbage Collection
    // Very important! Include all global variables, which can lead DOM
    // pollution, cleanup here
    popup.classList.remove('show');
    activeElement = null;
  }

  function delayCleanUp(){
    if (cleanupTimeout){
      window.clearTimeout(cleanupTimeout);
    }
    cleanupTimeout = window.setTimeout(cleanUp, 5000);
  }


  function onKeyDown(e) {

    // Arrow key with popup visible
    if (popup.classList.contains('show') && (e.which==37 || e.which==39)) {
      if (e.which==37) { activePreviousLetter(); }
      else if (e.which==39) { activateNextLetter(); }

      e.preventDefault();
      return;
    }

    if (ignoredKeys.indexOf(e.which)>-1) return;
    activeElement = e.target;

    if (e.which==lastWhich) {
      e.preventDefault();
      if (!timer) timer=window.setTimeout(onTimer, 10);
      return;
    }
    lastWhich=e.which;
  }

  function onKeyUp(e) {
    if (ignoredKeys.indexOf(e.which)>-1) return;
    if (activeElement==null) return;

    lastWhich=null;
    clearTimeout(timer);
    timer=null;

    hidePopup();
  }

  function onKeyPress(e){
    typedChar = String.fromCharCode(e.charCode);
  }

  function onTimer() {
    if (moreChars[typedChar]) {
      showPopup(typedChar+moreChars[typedChar]);
    } else {
      hidePopup();
    }
  }

  function showPopup(chars) {
    delayCleanUp();
    popup.empty();
    var letter;
    for (var i=0; i<chars.length; i++) {
      var letter = document.createElement('li');
      if (i == 0){
        letter.classList.add('selected');
      }
      letter.innerHTML = chars[i];
      letter.addEventListener('mouseover', activateLetter, false);
      letter.addEventListener('click', hidePopup, false);
      popup.appendChild(letter);
    }
    popup.classList.add('show');
    selectedCharIndex=0;
  }

  function activateLetter(e) {
    for (var i=0; i < popup.childNodes.length; i++){
      if (popup.childNodes[i] == e.target){
        selectCharIndex(i);
      }
    }
  }
  function activateRelativeLetter(i) {
    var childCount = popup.childNodes.length
    selectCharIndex((childCount+selectedCharIndex+i) % childCount);
  }
  function activateNextLetter() {
    activateRelativeLetter(1);
  }
  function activePreviousLetter() {
    activateRelativeLetter(-1);
  }

  function hidePopup() {
    popup.classList.remove('show');
  }

  function onWheel(e) {
    if (! popup.classList.contains('show')) return;
    e.preventDefault();
    e.wheelDelta<0 ? activateNextLetter() : activePreviousLetter();
  }

  function selectCharIndex(i) {
    delayCleanUp();
    popup.querySelector('.selected').classList.remove('selected');
    popup.childNodes[i].classList.add('selected');
    selectedCharIndex = i;
    updateChar();
  }

  function updateChar() {
    var newChar = (typedChar + moreChars[typedChar])[selectedCharIndex];
    var tag = activeElement.tagName;
    if (tag == 'TEXTAREA' || tag == 'INPUT'){
      // XXX
      var pos = getCaretPosition(activeElement);
      var arVal = activeElement.value.split('');
      arVal[pos-1] = newChar;
      activeElement.value = arVal.join('');
      setCaretPosition(activeElement, pos);
    } else {
      activeElement.ownerDocument.execCommand('delete', false, null);
      activeElement.ownerDocument.execCommand('insertHTML', false, newChar);
    }
  }

  function getCaretPosition (ctrl) {
    var caretPos = 0;
    if (document.selection) {
       // IE Support
       ctrl.focus ();
       var sel = document.selection.createRange ();
       sel.moveStart ('character', -ctrl.value.length);
       caretPos = sel.text.length;
    } else if (ctrl.selectionStart || ctrl.selectionStart == '0') {
       // Firefox support
       caretPos = ctrl.selectionStart;
    }
    return caretPos;
  }
  function setCaretPosition(ctrl, pos) {
    if (ctrl.setSelectionRange) {
      ctrl.focus();
      ctrl.setSelectionRange(pos,pos);
    } else if (ctrl.createTextRange) {
      var range = ctrl.createTextRange();
      range.collapse(true);
      range.moveEnd('character', pos);
      range.moveStart('character', pos);
      range.select();
    }
  }

  function LongPress(element) {
    element.addEventListener('keydown', onKeyDown, false);
    //element.addEventListener('keyup', onKeyUp, false);
    if (! element.ownerDocument.longPressActive){
      element.ownerDocument.addEventListener('mousewheel', onWheel, false);
      element.ownerDocument.addEventListener('keyup', onKeyUp, false);
      element.ownerDocument.addEventListener('keypress', onKeyPress, false);
      element.ownerDocument.longPressActive = true;
    }
    if (! popup){
      popup = document.createElement('ul');
      popup.className = 'long-press-popup';
      document.body.appendChild(popup)
    }

  }

  window.LongPress = LongPress;

}());
