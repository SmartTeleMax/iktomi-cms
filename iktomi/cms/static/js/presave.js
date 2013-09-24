/* Popup.js is required */
/* Apply all hooks that would be added, each of them must return boolean.  */

var ConfirmPopup = new Class({
  Implements: Events,

  initialize: function(confirm_texts, ok_text, cancel_text){
    this.result = false;
    this.popup = new Popup();
    for (var i = 0; i < confirm_texts.length; i++){
      this.popup.adopt(new Element('h3', {'text': confirm_texts[i]}));
    }

    var controls = new Element('div', {'class':'controls'});
    if (ok_text){ controls.adopt(this.confirm(ok_text)); }
    if (cancel_text){controls.adopt(this.cancel(cancel_text));}

    this.popup.adopt(controls);
  },

  show: function(){
    this.popup.show();
  },

  hide: function(){
    this.popup.hide();
  },

  confirm: function(text){
    var button = this.create_button(text)
    button.addEvent('click', function(){
      this.result = true;
      this.fireEvent('close', this);
      this.popup.hide();
    }.bind(this))
    return button
  },

  cancel: function(text){
    var button = this.create_button(text)
    button.addEvent('click', function(){
      this.fireEvent('close', this);
      this.popup.hide();
    }.bind(this))
    return button
  },

  create_button: function(text){
    return new Element('a', {'class':'button'}).adopt(new Element('span', {'text': text}))
  }
})

var PreSaveHook = new Class({
  Implements: Events,
  Binds : ['get_widget', 'confirm_rule', 'get_require_check'],

  initialize: function(frm){
    this.require_check = false;
    this.frm = frm;

    this.id = this.get_id();

    this.frm = frm;
    window.setTimeout(function(){
      // XXX hack to initialize after all widgets
      //     May be, place init-block on the bottom of the form?
      this.widget = this.get_widget(frm);
      this.confirm_rule();
    }.bind(this), 1);
  },

  get_id: function(){
    return Math.random().toString().replace('0.', '');
  },

  get_widget: function(){},

  confirm_rule: function(){},
  
  get_require_check: function(){
    return this.require_check;
  },

  get_delayed: function(){
      return false;
  }
  
})

var PreSaveHooks = new Class({
  Implements: Events,

  Binds: ['append', 'apply', 'get_result', 'append'],

  initialize: function(frm) {
    this.frm = frm;
    this.hooks = new Array();
    this.commiting = false;
//    this.popup = null;
    this.delayed_popup = null;
  },

  append: function(hook) {
    var hook_instance = new hook(this.frm);
    this.hooks.push(hook_instance);
  },

  apply: function(button) {
    if(!button.hasClass('button')) {
      button = button.getParent('.button');
    }

    var length = this.hooks.length;
    var common_text = [];

    for(var i=0; i<length; i++){
      if (this.hooks[i].get_require_check()) {
        common_text.push(this.hooks[i].confirm_text);
      }
    }

    if(common_text.length > 0) {
      var popup = new ConfirmPopup(common_text, button.get('text'), 'Вернуться к редактированию');
      popup.addEvent('close', function(){
            if (popup.result){
              this.delayed();
            }
      }.bind(this));
      popup.show();
    } else {
      this.delayed();
    }
  },

  delayed: function(){
    this.commiting = true;
    this.check_delayed();
  },

  check_delayed: function(){
    // function checking actions that can delay commit (f.e. file upload)
    // also is to be called after procedures that can change delay status (i.e. file upload is finished)
    if(this.commiting){
      var common_text = [];

      for(var i=0; i<this.hooks.length; i++){
         if (this.hooks[i].get_delayed()) {
           common_text.push(this.hooks[i].delayed_text);
         }
       }
  
      if(common_text.length > 0){
        if(!this.delayed_popup || this.delayed_text.length != common_text.length) {
          // XXX compare messages, not length!
          var popup = new ConfirmPopup(common_text, '', 'Закрыть');
          popup.addEvent('close', function(){
            this.commiting = false;
            if(this.delayed_popup){
              this.delayed_popup.hide();
              this.delayed_popup = null;
            }
          }.bind(this));

          this.delayed_popup = popup;
          this.delayed_text = common_text;
        }
        this.delayed_popup.show()
      } else {
        this.ready();
      }  
    }
  },

  ready: function(){
    this.commiting = false;
    this.fireEvent('ready');
    if(this.delayed_popup){
      this.delayed_popup.hide();
      this.delayed_popup = null;
    }
  }
});


