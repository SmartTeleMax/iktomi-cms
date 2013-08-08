(function(){
  function ItemForm(frm){
    var this_ = this;
    this._callback_hook = undefined;
    frm.store('ItemForm', this);
    frm.store('initData', formHash(frm));
    console.log('Generating ItemForm #'+frm.id);
    // XXX
    var is_popup = !!frm.getParent('.popup-body');
    var popup = frm.getParent('.popup');
    var container = frm.getParent('.popup-body') || $('app-content');
    var do_submit;

    function submit(frm, button, callback, url) {
      url = url || frm.getAttribute('action');
      this_.do_submit = function(){
        new Request.JSON({
          url: url + (url.indexOf('?') == -1? '?': '&') + '__ajax' +(is_popup?'&__popup=':''),
          onSuccess: function(result){
            if (result.success){
              if (this_._callback_hook) {
                this_._callback_hook(result, function(){
                  callback.call(button, result);
                });
              } else {
                callback.call(button, result);
              }
            } else {
              console.log('form load to', container)
              renderPage(result, container);
            }
          }
        }).post(frm); // XXX Post to IFRAME!
      }

      var hooks = frm.retrieve('hooks');
      hooks.apply(button);
    }

    function load(url){
      loadPage(url, true, container);
    }

    var redirectHandler = function(e) {
      e.preventDefault(); e.stopPropagation();
      submit(frm, this, function(result){
        load(this.getProperty('href'));
      });
    }

    frm.getElements('.buttons a[rel="after-post"]').addEvent('click', redirectHandler);

    frm.getElements('.buttons a[rel="post"]').addEvent('click', function(e) {
      e.preventDefault(); e.stopPropagation();

      var button = this;
      var url = this.getAttribute('href');
      function doSubmit(){
        submit(frm, button, function(result){
          renderPage(result, container);
        }, url);
      }

      if (!this.dataset.itemForm){
        var newData = formHash(frm);
        if (frm.retrieve('initData') != newData){

          var popup = new Popup(_popup_id(), {'close_button_on':false, 'clickable_overlay':false});
          var buttons_pane = new Element('div', {'class':'buttons'}).adopt(
            new Element('button', {'type': 'button', 'class': 'button', 'text': 'Продолжить'}).addEvent('click', function(){ popup.hide(); doSubmit(); }),
            new Element('button', {'type': 'button', 'class': 'button', 'text': 'Отменить'}).addEvent('click', function(){ popup.hide(); }));

          popup.setTitle('Объект был отредактирован со времени последнего сохранения. Это действие приведёт к потере всех изменений.');
          popup.adopt(buttons_pane);
          popup.show()
          return;
        }
      }
      doSubmit();
    });

    frm.getElements('.buttons a[rel="save"]').addEvent('click', function(e) {
      e.preventDefault(); e.stopPropagation();
      submit(frm, this, function(result){

        if(is_popup){
          popup.retrieve('popup').empty().hide();
        } else {
          load(this.getProperty('href'));
        }
      });
    });
    frm.getElements('.buttons a[rel="save-and-continue"]').addEvent('click', function(e) {
      e.preventDefault(); e.stopPropagation();
      submit(frm, this, function(result){
        load(result.item_url, true, container);
      });
    });
    frm.getElements('.buttons a[rel="save-and-add"]').addEvent('click', redirectHandler);

    var hooks = new PreSaveHooks(frm);
    hooks.addEvent('ready', function(){
      this_.do_submit.delay(0);
    });
    frm.store('hooks', hooks);

    if (frm.getProperty('data-presavehooks')){
      var hooks_list = frm.dataset.presavehooks.split(' ');
      console.log(hooks_list);
      for (var i=0; i<hooks_list.length; i++){
        hooks.append(window[hooks_list[i]]);
      }
    }

    window.scrollTo(window.scrollX, window.scrollY+1);
    $('loader-overlay').setStyle('display', 'none');
  }

  function formHash(el){
    /*
     * pseudo-qs formatting for form content
     */
    // XXX hash?
    var queryString = [];
    el.getElements('input, select, textarea').each(function(el){
      var type = el.type;
      if (!el.name || el.name.charAt('0') == '_' || el.name == 'edit_session' || el.disabled || 
          type == 'submit' || type == 'reset' || type == 'file' || type == 'image') return;

      var value = (el.get('tag') == 'select') ? el.getSelected().map(function(opt){
        // IE
        return document.id(opt).get('value');
      }) : ((type == 'radio' || type == 'checkbox') && !el.checked) ? null : el.get('value');

      Array.from(value).each(function(val){
        if (typeof val != 'undefined') queryString.push(el.name + '=' + val.trim());
      });
    });
    return queryString.sort().join('&');
  }

  Blocks.register('item-form', function(el){
    new ItemForm(el);
  });
})();
