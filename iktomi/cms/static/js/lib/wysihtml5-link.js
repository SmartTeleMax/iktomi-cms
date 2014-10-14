(function(wysihtml5) {
  // XXX copied from wysihtml5 with changes
  var undef,
      NODE_NAME = "A",
      dom       = wysihtml5.dom;
  
  function _removeFormat(composer, anchors) {
    var length  = anchors.length,
        i       = 0,
        anchor,
        codeElement,
        textContent;
    for (; i<length; i++) {
      anchor      = anchors[i];
      codeElement = dom.getParentElement(anchor, { nodeName: "code" });
      textContent = dom.getTextContent(anchor);

      // if <a> contains url-like text content, rename it to <code> to prevent re-autolinking
      // else replace <a> with its childNodes
      if (textContent.match(dom.autoLink.URL_REG_EXP) && !codeElement) {
        // <code> element is used to prevent later auto-linking of the content
        codeElement = dom.renameElement(anchor, "code");
      } else {
        dom.replaceWithChildNodes(anchor);
      }
    }
  }

  function _format(composer, attributes) {
    var doc             = composer.doc,
        tempClass       = "_wysihtml5-temp-" + (+new Date()),
        tempClassRegExp = /non-matching-class/g,
        i               = 0,
        length,
        anchors,
        anchor,
        hasElementChild,
        isEmpty,
        elementToSetCaretAfter,
        textContent,
        whiteSpace,
        j;
    wysihtml5.commands.formatInline.exec(composer, undef, NODE_NAME, tempClass, tempClassRegExp);
    anchors = doc.querySelectorAll(NODE_NAME + "." + tempClass);
    length  = anchors.length;
    for (; i<length; i++) {
      anchor = anchors[i];
      anchor.removeAttribute("class");
      for (j in attributes) {
        anchor.setAttribute(j, attributes[j]);
      }
    }

    elementToSetCaretAfter = anchor;
    if (length === 1) {
      textContent = dom.getTextContent(anchor);
      hasElementChild = !!anchor.querySelector("*");
      isEmpty = textContent === "" || textContent === wysihtml5.INVISIBLE_SPACE;
      if (!hasElementChild && isEmpty) {
        dom.setTextContent(anchor, attributes.text || anchor.href);
        whiteSpace = doc.createTextNode(" ");
        composer.selection.setAfter(anchor);
        dom.insert(whiteSpace).after(anchor);
        elementToSetCaretAfter = whiteSpace;
      }
    }
    composer.selection.setAfter(elementToSetCaretAfter);
  }

  wysihtml5.commands.createLink = {

    _initDropdown: function(composer){
      var id = composer.textarea.element.id + '-create-link';
      var dropdown = document.getElementById(id);
      if (dropdown.dataset.init){ return dropdown; }
      dropdown.dataset.init = true;

      dropdown.getElement('[data-wysihtml5-dialog-action="save"]').addEvent('click', function(){
        var value = dropdown.getElement('[data-wysihtml5-dialog-field="href"]').value;
        composer.commands.exec('createLink', value);
      });

      dropdown.getElement('[data-wysihtml5-dialog-field="href"]').addEvent('keydown', function(event) {
         if (event.key == 'enter') {
           var value = dropdown.getElement('[data-wysihtml5-dialog-field="href"]').value;
           composer.commands.exec('createLink', value);
         }
      });

      return dropdown;
    },

    exec: function(composer, command, value) {
      var dropdown = this._initDropdown(composer);
      var anchors = this.state(composer, command);
      if (!value){
        var display = dropdown.style.display == 'none'? '': 'none';
        $$('.wysihtml5-dialog').setStyle('display', 'none');
        dropdown.setStyle('display', display);
        if (anchors) {
          var a = anchors[0];
          dropdown.getElement('[data-wysihtml5-dialog-field="href"]').set('value', a.getAttribute('href'));
        } else {
          dropdown.getElement('[data-wysihtml5-dialog-field="href"]').set('value', 'http://');
        }
      } else if (anchors) {
        for(var i=anchors.length; i--;){
          anchors[i].setAttribute('href', value)
        }
        $$('.wysihtml5-dialog').setStyle('display', 'none');
      } else {
        // Create links
        value = typeof(value) === "object" ? value : { href: value };
        _format(composer, value);
        $$('.wysihtml5-dialog').setStyle('display', 'none');
      }
    },

    state: function(composer, command) {
      return wysihtml5.commands.formatInline.state(composer, command, "A");
    }
  };

  wysihtml5.commands.unlink = {
    createCommand: wysihtml5.commands.createLink,
    exec: function(composer, command, value) {
      var anchors = this.createCommand.state(composer, command);
      composer.selection.executeAndRestore(function() {
        _removeFormat(composer, anchors);
        $$('.wysihtml5-dialog').setStyle('display', 'none');
      });
    }
  }

})(wysihtml5);
