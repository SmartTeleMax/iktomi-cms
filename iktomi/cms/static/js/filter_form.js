(function(){
  function FilterForm(form){
    this.init(form);
  }
 
  FilterForm.prototype = {
    'init': function(form){
      this.form = form;
      this.$events = {}; // XXX is not copied
      form.store('filterForm', this);
      form.store('submitFilter', this.submit.bind(this));
      this.paginator();
      this.$events = {};
      this.changeUrl = !this.form.getParent('.popup');
      this.submitButton = form.getElement('.sidefilter__submit');
      this.clearButton = form.getElement('.sidefilter__clear');
      this.closeButton = form.getElement('.sidefilter-close');

      this.submitButton.addEvent('click', this.onSubmitClick.bind(this));
      this.clearButton.addEvent('click', this.onClearClick.bind(this));
      this.closeButton.addEvent('click', function(e){
        this.toggle();
        this.saveState();
      }.bind(this));
      //form.getElement('.sidefilter-tags').addEvent('click', function(e){
      //  this.form.getParent('.sidefilter').toggleClass('is-open');
      //}.bind(this));

      this.setFilters();

      this.restoreState();

      //form.getParent('.sidefilter').addEvent('click', function(){
      //  this.form.getParent('.sidefilter').addClass('is-open');
      //}.bind(this));
    },
    'toggle': function(open) {
      var sidefilter = this.form.getParent('.sidefilter');
      sidefilter.toggleClass('is-open', open);
      var minHeight = sidefilter.getElement('form').getHeight();
      this.form.getParent('.stream').setStyle('min-height', minHeight);
    },
    'getFilterKey': function() {
      var isPopup = this.form.getParent('.popup') ? '-popup' : '';
      return this.form.get('action') + isPopup;
    },
    'saveState': function() {
      var key = this.getFilterKey();
      if (key) {
        var sidefilter = this.form.getParent('.sidefilter');
        var value = sidefilter.hasClass('is-open') ? 'opened' : 'closed';
        lscache.set(key, value, 7 * 24 * 60);
      }
    },
    'restoreState': function() {
      var key = this.getFilterKey();
      if (key) {
        var value = lscache.get(key);
        if (value) {
          this.toggle(value == 'opened');
        }
      }
    },
    'getSubmitUrl': function() {
      var qs = this.form.toQueryString();
      qs = qs.replace(/[^&]+=\.?(?:&|$)/g, '').replace(/&$/, '');
      return this.form.getProperty('action') + '?' + qs;
    },
    'submit': function(url){
      url = (url === undefined? this.getSubmitUrl(): url);

      this.submitButton.addClass('is-loading');
      var livesearch = this.form.getParent('.stream').getElement('.livesearch');
      if (livesearch) { livesearch.addClass('is-loading'); }

      var form = this.form;
      new Request({
        'url': url + (url.indexOf('?') == -1? '?': '&') + '__ajax&__no_layout',
        'onSuccess': function(result){
          if (this.changeUrl){
            history.pushState(null, null, url);
          }
          //if (this.changeUrl){
          //  window.current_url = url;
          //}
          var container = form.getParent('.stream').getElement('.stream-items');
          renderPage(result, container);
          this.fireEvent('load');
          var addButton = this.form.getParent('.content').getElement('.js-button-add');
          if(addButton){
            var qs = url.split('?')[1];
            var href = addButton.get('href').split('?')[0] + (qs? '?' + qs: '');
            addButton.set('href', href);
          }
          this.setFilters();
          this.scrollToTop();

        }.bind(this),

        'onComplete': function() {
          this.submitButton.removeClass('is-loading');
          if (livesearch) { livesearch.removeClass('is-loading'); }
        }.bind(this)
      }).get();
    },

    'setFilters': function(){
      var livesearch = this.form.getParent('.stream').getElement('.livesearch input');
      if (!livesearch) { return; }
      livesearch.retrieve('widget').setFilters();
    },

    'paginator': function(){
      this.form.getParent('.stream').addEventListener('click', function(e){
        var link = e.target.tagName == 'A'? e.target: e.target.getParent('a');
        if(link){
            var url = link.getAttribute('href');
            if(url !== null){
                if (url.indexOf('://') != -1 ||
                      url.indexOf('javascript:') == 0
                      || e.ctrlKey || e.metaKey || e.shiftKey){
                  return;
                }
            }
        }
        if (link && e.target.getParent('.pages')){
          this.submit(link.getAttribute('href'));
          e.preventDefault(); e.stopPropagation();
        }
      }.bind(this), false);
    },

    onSubmitClick: function(e){
      e.preventDefault();
      this.form.retrieve('submitFilter')();
    },

    onClearClick: function(e) {
      e.preventDefault();
      this.form.getElements('.w-popup-stream-select').each(function(item) {
          item.getElements('input').each(function(item) {
              item.destroy();
          });
          item.getElements('.item').each(function(item) {
              item.destroy();
          });
      });

      this.form.reset();
      this.form.getElements('input').each(function(item){
          item.value = '';
      });
      this.form.retrieve('submitFilter')();
    },

    scrollToTop: function() {
      document.body.scrollTop = 0; // For Chrome, Safari and Opera 
      document.documentElement.scrollTop = 0; // For IE and Firefox
    }
  };

  FilterForm.implement(Events.prototype);

  Blocks.register('filter-form', function(elem){
    new FilterForm(elem);
  });
  Blocks.register('locked-icon', function(el){
    if(window.sessionStorage[el.dataset.guid] == el.dataset.editSession){
      // Hide lock icon if the lock belongs to actual browser tab
      el.destroy();
    }
  });
  window.FilterForm = FilterForm;
})();
