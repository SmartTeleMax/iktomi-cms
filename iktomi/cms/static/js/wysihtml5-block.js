(function(){
  window.wysihtml5Init = function(el){
    el = $(el);
    var config = JSON.parse(el.dataset.config);
    var editor = new wysihtml5.Editor(el.id, { // id of textarea element
      stylesheets: ["/static/css/wysihtml5-content.css"],
      useLineBreaks: false,
      toolbar: el.id + '-toolbar', // id of toolbar element
      //parser: function(elementOrHtml, rules, context, cleanUp) {
      //  // XXX Temporary disabled html cleanup. 
      //  //     To enable, remove parser from config and define parserRules
      //  context           = context || elementOrHtml.ownerDocument || document;
      //  var isString      = typeof(elementOrHtml) === "string",
      //      element;
      //  
      //  if (isString) {
      //    element = wysihtml5.dom.getAsDom(elementOrHtml, context);
      //  } else {
      //    element = elementOrHtml;
      //  }
      //  
      //  return isString ? wysihtml5.quirks.getCorrectInnerHTML(element) : element;
      //}
      parserRules: config.parserRules // defined in parser rules set 
    });
    editor.composer.iframe.contentDocument.addEventListener('click', function(e){
      $$('.wysihtml5-dialog').setStyle('display', 'none');
    }, true);

    el.store('widget', editor);

    $(el.id + '-toolbar').getElements('.btn').each(function(btn){
      btn.set('title', btn.get('text'));
    });
  }

  Blocks.register('wysihtml5', window.wysihtml5Init);

  document.addEvent('click', function(e){
    if(!e.target.hasClass('wysihtml5-dialog') && 
        !e.target.getParent('.wysihtml5-toolbar') &&
        !e.target.getParent('.wysihtml5-dialog')){
      $$('.wysihtml5-dialog').setStyle('display', 'none');
    }
  }, true)
})();

(function(){
    // monkeypatching wysihtml5 Toolbar
    wysihtml5.toolbar.Toolbar.prototype.execCommand = function(command, commandValue) {
      if (this.commandsDisabled) {
        return;
      }

      var commandObj = this.commandMapping[command + ":" + commandValue];

      // Show dialog when available
      if (commandObj && commandObj.dialog) { // this line is changed
        if (wysihtml5.commands[command] && wysihtml5.commands[command].showDialog){
          wysihtml5.commands[command].showDialog(commandObj.dialog, this.composer, command);
        } else {
          commandObj.dialog.show();
        }
      } else {
        this._execCommand(command, commandValue);
      }
    }
})(wysihtml5);

(function(wysihtml5) {

  var PopupStreamSelectPlugin = {

    _removeFormat: function(composer, anchors) {
      var length  = anchors.length,
          i       = 0,
          anchor;
      for (; i<length; i++) {
        var anchor = anchors[i];

        wysihtml5.dom.replaceWithChildNodes(anchor);
      }
    },

    _init: function(composer){
      var id = composer.textarea.element.id + '-' + this.propertyName;
      var sel = document.getElementById(id);
      if (!sel.retrieve('widget')){
        extendRange(composer.iframe.contentWindow)
        var stream_select = new PopupStreamSelect(false, {"readonly": false, 
                  "allow_create": true, 
                  "container": id, 
                  "reorderable": false, 
                  "title": "\u0424\u0430\u0439\u043b\u044b", 
                  "url": "/"+this.streamName, 
                  "input_name": '__'+this.streamName, 
                  "create_url": "/"+this.stream_name+"/+", 
                  "unshift": false});
        stream_select.addEvent('change', function(e){
          //this.restoreSelection();
          //if (this.isFileLinksEnabled()){

            var value = stream_select.getInput().value;
            composer.commands.exec(this.commandName, value)

          //}
        }.bind(this));
      }
      return sel;

    },

    tagName: 'ABBR',

    exec: function(composer, command, value) {
      var dropdown = this._init(composer);
      var stream_select = dropdown.retrieve('widget');
      if (!value){
        dropdown.setStyle('display', dropdown.style.display == 'none'? '': 'none');
      } else if(value == 'select'){
        stream_select.show();
      } else if(value == 'create'){
        stream_select.load(stream_select.options.create_url);
      } else if(value == 'delete'){
        var abbrs = this.state(composer, command);
        if (abbrs){
          composer.selection.executeAndRestore(function() {
            this._removeFormat(composer, abbrs);
          }.bind(this));
        }
      } else {
        var abbr = new Element(this.tagName, {'title': this.propertyName + ":" + value})

        composer.selection.getRange().nativeRange.wrapInlineSelection(abbr, composer.element);
      }
    },

    state: function(composer, command) {
      var state = wysihtml5.commands.formatInline.state(composer, command, this.tagName);
      if (state && state[0].title.substr(0, this.propertyName.length+1) != this.propertyName+':'){
        state = false;
      }
      return state;
    }
  };

  wysihtml5.commands.PopupStreamSelectPlugin = PopupStreamSelectPlugin;

  /*
   * Usage:
   *
   * wysihtml5.commands.fileLink = Object.merge(Object.create(PopupStreamSelectPlugin), {
   *   propertyName: 'filelink',
   *   commandName:  'fileLink',
   *   streamName:   'files'
   * });
  */

})(wysihtml5);

(function(wysihtml5) {
  function formatBlockCommand(tag){
    return {

      exec: function(composer, command, value) {
        if(this.state(composer, command)){
          composer.commands.exec('formatblock', 'p');
        } else {
          composer.commands.exec('formatblock', tag);
        }
      },

      state: function(composer, command) {
        return wysihtml5.commands.formatBlock.state(composer, command, tag.toUpperCase());
      }
    };
  }

  wysihtml5.commands.blockquote = formatBlockCommand('blockquote');
  wysihtml5.commands.h1 = formatBlockCommand('h1');
  wysihtml5.commands.h2 = formatBlockCommand('h2');
  wysihtml5.commands.h3 = formatBlockCommand('h3');
  wysihtml5.commands.h4 = formatBlockCommand('h4');
})(wysihtml5);

(function(wysihtml5) {
  function formatInlineCommand(tag){
    return {

      exec: function(composer, command, value) {
        composer.commands.exec('formatInline', tag);
      },

      state: function(composer, command) {
        return wysihtml5.commands.formatInline.state(composer, command, tag.toUpperCase());
      }
    };
  }

  wysihtml5.commands.sup = formatInlineCommand('sup');
  wysihtml5.commands.sub = formatInlineCommand('sub');
})(wysihtml5);

(function(wysihtml5) {

  wysihtml5.commands.undo.state = function(composer, command) {
    var link = composer.parent.toolbar.commandMapping['undo:null'].link;
    link.toggleClass('disabled', !composer.undoManager.undoPossible())
    return false;
  };

  wysihtml5.commands.redo.state = function(composer, command) {
    var link = composer.parent.toolbar.commandMapping['redo:null'].link;
    link.toggleClass('disabled', !composer.undoManager.redoPossible())
    return false;
  };

})(wysihtml5);

function extendRange(window){
  // support browsers and IE, using ierange with Range exposed
  // XXX why this doesn't work without Range exposed
  var Range = window.Range || window.document.createRange().constructor;
  
  Range.prototype.splitBoundaries = function() {
    var sc = this.startContainer,
        so = this.startOffset,
        ec = this.endContainer,
        eo = this.endOffset;
    var startEndSame = (sc === ec);
  
    if (ec.nodeType == 3 && eo < ec.length) {
      ec.splitText(eo);
    }
  
    if (sc.nodeType == 3 && so > 0) {
      sc = sc.splitText(so);
      if (startEndSame) {
        eo -= so;
        ec = sc;
      }
      so = 0;
    }
    this.setStart(sc, so);
    this.setEnd(ec, eo);
  };
  
  Range.prototype.getTextNodes = function() {
    var iterator = this.getElementIterator();
    var textNodes = [], node;
    while ((node = iterator())){
      // XXX was there a reason to check for empty string?
      // with this check selecting two sibling words separately
      // and then selecting them both in one range doesn't work properly
      if (node.nodeType == 3){// && !node.data.match(/^\s*$/)){
        textNodes.push(node);
      }
    }
    return textNodes;
  };

  Range.prototype.getElementIterator = function(reversed){
    if (reversed) {
      return elementIterator(null, this.endContainer, this.startContainer, true);
    } else {
      return elementIterator(null, this.startContainer, this.endContainer);
    }
  };

  Range.prototype.wrapSelection = function(element){
    this.splitBoundaries();
    var textNodes = this.getTextNodes();
    for (var i=textNodes.length; i--;){
      // XXX wrap sibling text nodes together
      var el = element.clone(true, true);
      textNodes[i].parentNode.insertBefore(el, textNodes[i]);
      el.appendChild(textNodes[i]);
    }
  };

  Range.prototype.isInline = function(){
    var iter = this.getElementIterator();
    var is_inline = true;
    var el;
    while(el = iter()){
      if (el.nodeType == 1 && getCompiledStyle(el, 'display') != 'inline'){
        return false;
      }
    }
    return true;
  }

  Range.prototype.wrapInlineSelection = function(element, container){
    container = container || document.body;

    this.splitBoundaries();

    var s = this.startContainer;
    var parents = [];
    while (s && s != container && s != document.body){
      s = s.parentNode;
      parents.push(s);
    }

    var commonParent = this.endContainer;
    while (commonParent && !parents.contains(commonParent)){
      commonParent = commonParent.parentNode;
    }

    var start = this.startContainer;
    while (start.parentNode != commonParent){
      if (start.previousSibling){
        var clone = start.parentNode.clone(false).inject(start.parentNode, 'before');
        while(start.previousSibling){
          clone.adopt(start.previousSibling, 'top');
        }
      }
      start = start.parentNode;
    }

    var end = this.endContainer;
    while (end.parentNode != commonParent){
      if (end.nextSibling){
        var clone = end.parentNode.clone(false).inject(end.parentNode, 'after');
        while(end.nextSibling){
          clone.adopt(end.nextSibling);
        }
      }
      end = end.parentNode;
    }

    element.inject(start, 'before').adopt(start);
    var next = start;
    while (next != end && element.nextSibling){
      next = element.nextSibling;
      element.adopt(next);
    }
  }

  function elementIterator(parent, cont, end, reversed){
      reversed = !!reversed;
      cont = cont || parent[reversed? 'lastChild' : 'firstChild'];
      var finished = !cont;
      var up = false;

      function next(){
          if (finished) {return null;} 
          var result = cont;
          if (cont.childNodes && cont.childNodes.length && !up){
              cont = cont[reversed? 'lastChild' : 'firstChild'];
          } else if (cont[reversed? 'previousSibling' : 'nextSibling']){
              cont = cont[reversed? 'previousSibling' : 'nextSibling'];
              up = false;
          } else if (cont.parentNode){
              cont = cont.parentNode;
              if (cont === parent){ finished = true; }
              up = true;
              next();
          }
          if (result === end) { finished = true; }
          return result;
      }
      return next;
  }

  function getCompiledStyle(elem, strCssRule){
    // copypasted from Internets
    var strValue = "";
    if(document.defaultView && document.defaultView.getComputedStyle){
      strValue = document.defaultView.getComputedStyle(elem, "").getPropertyValue(strCssRule);
    } else if(elem.currentStyle){
      strCssRule = strCssRule.replace(/\-(\w)/g, function (strMatch, p1){
        return p1.toUpperCase();
      });
      strValue = elem.currentStyle[strCssRule];
    }
    return strValue;
  }
  window.getCompiledStyle = getCompiledStyle;
}

extendRange(window);
