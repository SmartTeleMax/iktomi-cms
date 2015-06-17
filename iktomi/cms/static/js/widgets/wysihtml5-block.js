(function(){
  window.wysihtml5Init = function(el){
    el = $(el);
    var config = JSON.parse(el.dataset.config);
    var editor = new wysihtml5.Editor(el.id, { // id of textarea element
      stylesheets: config.stylesheets,
      useLineBreaks: false,
      toolbar: $(el.id + '-toolbar'), // id of toolbar element
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
      parserRules: config.parserRules, // defined in parser rules set
      cleanerConfig: config.cleanerConfig,
    });
    var iframe = editor.composer.iframe;



    function attachIFrame(){
      editor.composer.iframe.contentDocument.addEventListener('click', function(e){
        e.preventDefault(); // do not handle clicks, especially on links
        $$('.wysihtml5-dialog').setStyle('display', 'none');
      }, true);
      extendRange(editor.composer.iframe.contentWindow)
    }
    iframe.addEventListener('load', attachIFrame, false);
    attachIFrame();

    el.store('widget', editor);

    var toolbar = $(el.id + '-toolbar');
    if (toolbar) {
      toolbar.getElements('.btn').each(function(btn){
        btn.set('title', btn.get('text'));
      });
    }

    if (window.LongPress){
      window.setTimeout(function(){
        LongPress(editor.composer.element);

        if (el.getProperty('readonly')){
          // Do not change styles for disabled (readonly) elements
          editor.composer.disabledStylesHost = document.createElement('div');
          editor.composer.disable();
        }

      }, 500); // XXX delay is not good solution here
    }
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
      if (commandObj && commandObj.dialog) {                    // this line is changed
        $$('.wysihtml5-dialog').setStyle('display', 'none');    // this line is changed
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
        var streamUrl = sel.dataset.streamUrl || ("/"+this.streamName)
        var streamSelect = new PopupStreamSelect(false, {"readonly": false, 
                  "allow_create": true, 
                  "container": id, 
                  "reorderable": false, 
                  "url": streamUrl, 
                  "input_name": '__'+this.streamName, 
                  "create_url": streamUrl+"/+", 
                  "unshift": false});
        streamSelect.addEvent('change', function(e){
          //this.restoreSelection();
          //if (this.isFileLinksEnabled()){

            var value = streamSelect.getInput().value;
            composer.commands.exec(this.commandName, value)

          //}
        }.bind(this));
      }
      return sel;

    },

    tagName: 'ABBR',

    exec: function(composer, command, value) {
      var dropdown = this._init(composer);
      var streamSelect = dropdown.retrieve('widget');
      if (!value){
        var display = dropdown.style.display == 'none'? '': 'none';
        $$('.wysihtml5-dialog').setStyle('display', 'none');
        dropdown.setStyle('display', display);
      } else if(value == 'select'){
        streamSelect.show();
      } else if(value == 'create'){
        streamSelect.load(streamSelect.options.create_url);
      } else if(value == 'delete'){
        var abbrs = this.state(composer, command);
        if (abbrs){
          composer.selection.executeAndRestore(function() {
            this._removeFormat(composer, abbrs);
          }.bind(this));
        }
      } else {
        var abbr = this.createElement(value, composer);

        composer.selection.getRange().nativeRange.wrapInlineSelection(abbr, composer.element);
      }
    },

    createElement: function(value, composer){
      var win = composer.iframe.contentWindow;
      var elem = win.document.createElement(this.tagName);
      elem.setAttribute('title', this.propertyName + ":" + value);
      return elem;
    },

    elementMatches: function(el){
      return el.title.substr(0, this.propertyName.length+1) == this.propertyName+':'
    },

    state: function(composer, command) {
      var state = wysihtml5.commands.formatInline.state(composer, command, this.tagName);
      if (state && !this.elementMatches(state[0])){
        state = false;
      }
      return state;
    }
  };

  wysihtml5.commands.PopupStreamSelectPlugin = PopupStreamSelectPlugin;

  /*
   * Usage:
   *
   * wysihtml5.commands.fileLink = Object.append(Object.create(PopupStreamSelectPlugin), {
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

  wysihtml5.commands.h1 = formatBlockCommand('h1');
  wysihtml5.commands.h2 = formatBlockCommand('h2');
  wysihtml5.commands.h3 = formatBlockCommand('h3');
  wysihtml5.commands.h4 = formatBlockCommand('h4');
})(wysihtml5);

(function(wysihtml5) {
  wysihtml5.commands.blockquote = {

    exec: function(composer, command, value) {
      var tag = this.state(composer, command);
      if (tag){
        for (var j = tag.childNodes.length; j--;){
          tag.parentNode.insertBefore(tag.childNodes[j], tag.nextSibling);
        }
        tag.parentNode.removeChild(tag);
      } else {
        var bq = document.createElement('blockquote');
        var range = composer.selection.getRange().nativeRange
        range.wrapBlockSelection(bq)
      }
    },

    state: function(composer, command) {
      return wysihtml5.commands.formatBlock.state(composer, command, 'BLOCKQUOTE');
    }
  };

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

(function(wysihtml5) {
  wysihtml5.commands.indent = {
    cmd: 'indent',
    exec: function(composer, command, value) {
      if (this.indentable(composer, command)){
        composer.commands.doc.execCommand(this.cmd);
      }
    },
    indentable: function(composer, command){
      var range = composer.selection.getRange().nativeRange;
      var ul = wysihtml5.commands.formatBlock.state(composer, command, 'UL');
      var ol = wysihtml5.commands.formatBlock.state(composer, command, 'OL');
      return !!(ul || ol);
    },
    state: function(composer, command) {

      var link = composer.parent.toolbar.commandMapping[this.cmd+':null'].link;
      link.toggleClass('disabled', !this.indentable(composer, command));
      return false;
    }
  };

  wysihtml5.commands.outdent = Object.merge(Object.create(wysihtml5.commands.indent), {
    cmd: 'outdent'
  });
})(wysihtml5);

(function(wysihtml5) {
  wysihtml5.commands.fullscreen = {
    exec: function(composer, command, value) {
      // XXX mootools dependencies
      var widget = composer.textarea.element.getParent('.wysihtml5-widget');
      var add = widget.hasClass('fullscreen')?'removeClass': 'addClass';

      widget.setStyle('width', '');
      widget.setStyle('height', '');
      widget[add]('fullscreen');
      document.body[add]('wysihtml5-fullscreen');
    }
  }

})(wysihtml5);

(function(wysihtml5) {
  wysihtml5.views.Composer.prototype.withNoHistory = function(callback){
    this.undoManager.transact();
    var position = this.undoManager.position;
    callback.call(this);
    this.undoManager.transact();
    var newPosition = this.undoManager.position;
    if (newPosition > position){
      // history nothing actually changed, but history has two entries
      // we have to remove previous entry
      this.undoManager.historyStr.splice(position-1, 1);
      this.undoManager.historyDom.splice(position-1, 1);
      this.undoManager.position -= 1;
      this.undoManager.version -= 1;
    }
  }
})(wysihtml5);

