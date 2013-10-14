  var TabSelect = new Class ({

    Implements: Options,

    options: {
      inject_to: null, //css class or html element
      el: null
    },

    initialize: function(el, options){
      this.el = $(el);
      this.setOptions(options);

      this.el.getParent('.form-row').addClass('hide');
      var inject_to = this.options.inject_to;
      if(typeof(this.options.inject_to) == 'string'){
        inject_to = this.el.getParent('.content').getElement('.'+this.options.inject_to);
      }
      this.container = new Element('div').inject(inject_to);
      this.setup();
    },

    setup: function(){
      this.el.getChildren('option').each(function(option) {   
        var tab = new Element('button', {
          html: option.innerHTML
        });
        if (option.getProperty('selected')) {
          tab.addClass('selected');
          if (this.options['option_hook_'+option.value]){
            eval(this.options['option_hook_'+option.value]);
          }
        }

        tab.addEventListener('click', function(e) {
          e.preventDefault(); e.stopPropagation();
          this.container.getChildren('button').removeClass('selected');
          tab.addClass('selected');
          option.setProperty('selected', true);
          this.submit();
        }.bind(this));
        tab.inject(this.container);
      }.bind(this), false);
    },

    submit: function() {
      this.el.getParent('form').retrieve('submitFilter')();
    }

  });

  Blocks.register('tab-select', function(el){
    new TabSelect(el.getElement('select'), JSON.parse(el.dataset.config));
  });
