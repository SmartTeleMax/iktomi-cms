(function(){
  function ItemForm(frm){
    var this_ = this;
    this._callback_hook = undefined;
    frm.store('ItemForm', this);
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
      submit(frm, this, function(result){
        renderPage(result, container);
      }, this.getAttribute('href'));
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

  Blocks.register('item-form', function(el){
    new ItemForm(el);
  });
})();
