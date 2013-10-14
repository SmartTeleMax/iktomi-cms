var PopupFilteredSelect = new Class({
    Implements: [Options, Events],

    initialize: function(field, options){//multiple, required, disable_unpublished){
        this.setOptions(options);
        this.field = $(field);
        this.field.store('widget', this);
        this.field.set('value', null);
        this.multiple = options.multiple;
        this.required = options.required;
        this.disable_unpublished = options.disable_unpublished;
        this.field_id = this.field.id;
        this.values = this.field.getElement('.selected_values');
        this.listbutton = $(this.field_id+'-listbutton');

        this.options = new Hash();
        this.disabled_options = new Hash();
        this.selected_options = new Hash();

        this.popup = new Popup();

        this.filter_by = '';
        this.listbutton.addEvent('click', function(){
            this.draw_list(this.popup);
            this.popup.show();
            $(this.field_id+'-search').focus();
        }.bind(this));

        this.values.getElements('input').each(function(opt){
          this.options.set(opt.value, {'value':opt.value,
              'title':opt.getNext('label').get('html'),
              'selected':(opt.checked)
              });
          if(opt.checked){
          this.selected_options.set(opt.value, opt.value);
          }
          opt.addEvent('change', function(e){
            if(!e.target.get('checked')){
              this.deselect_value(e.target.value);
            }
          }.bind(this));
          opt_label = opt.getNext('label');
          if(this.disable_unpublished && !opt_label.hasClass('published')){
            this.disabled_options.set(opt.value, opt_label);
          }
          opt_label.addEvent('click', function(e){
            e.preventDefault();
            this.draw_list(this.popup);
            this.popup.show();
            $(this.field_id+'-search').focus();
          }.bind(this));

          if(this.multiple || !this.required){
            opt.getNext('span').addEvent('click', function(e){
              this.deselect_value(e.target.getPrevious('input').value);
            }.bind(this));
          } else {
            opt.getNext('label').addClass('right_round');
            opt.getNext('span').destroy();
          }
        }.bind(this));
        if(this.selected_options.getLength()>0){
          this.field.value=this.selected_options.getValues()[this.selected_options.getLength()-1];
        }
    },

    select_value: function(value){
        if (!this.multiple){
            this.selected_options=new Hash();
            this.values.getElements('.selected').removeClass('selected');
        }

        this.selected_options.set(value, value);
        var checkbox = $(this.field_id+'-'+value);
        checkbox.set('checked', true);
        checkbox.getParent().addClass('selected');
        this.change_value(value);
        if(!this.multiple)
        this.popup.hide();
    },

    deselect_value: function(value){
        this.selected_options.erase(value);
        var checkbox = $(this.field_id+'-'+value);
        checkbox.set('checked', false);
        checkbox.getParent().removeClass('selected');
        this.change_value(value);
    },

    deselect_all: function(){
        this.selected_options.each(this.deselect_value.bind(this));
    },

    change_value: function(value){
        if(this.selected_options.get(value)) {
        this.field.set('value', value);
        } else {
        this.field.set('value', null);
        }
        this.field.fireEvent('value_changed', this.field);
    },

    filter_handler: function(e){
        this.filter_by = e.target.value;
        var options = this.options;
        var visible_options = new Hash();

        options.each(function(opt){
            var start = opt.title.toLowerCase().search(this.filter_by.toLowerCase())
            if (start >-1){
                visible_options.set(opt.value, {'title':opt.title, 'value':opt.value, 'start':start});
            }
        }.bind(this));
        this.build_selectable(this.popup, visible_options, this.filter_by.length);

    },

    build_selectable: function(popup, new_options, hl_len){
        popup.contentEl.empty();
        new_options.each(function(opt, value){
            if(hl_len) {
            var opt_title = opt.title.substring(0, opt.start)+'<b>'+opt.title.substring(opt.start, opt.start+hl_len)+'</b>'+opt.title.substring(opt.start+hl_len);
            } else {
            var opt_title = opt.title;
            }
            var new_opt = new Element('div', {
                'html': opt_title,
                'id':this.field_id+'-'+opt.value+'-list',
                'class':'filter-list-value'}).addEvents({
                    'mouseenter':function(){this.addClass('hover')},
                    'mouseleave': function(){this.removeClass('hover')}
                });


            if(this.disabled_options.get(value)==null){
            new_opt.addEvent('click', function(e){
                var target = e.target.hasClass('filter-list-value')?
                                e.target:
                                e.target.getParent('.filter-list-value');
                var id = target.id.replace('-list', '').replace(this.field_id+'-', '');
                if(target.hasClass('selected')){
                    this.deselect_value(id);
                    target.removeClass('selected');
                } else {
                    if(!this.multiple){
                        popup.contentEl.getElements('.selected').removeClass('selected');
                    }
                    this.select_value(id);
                    target.addClass('selected');
                }
                }.bind(this));
            } else {
                new_opt.addClass('disabled');
            }
            if($(this.field_id+'-'+opt.value).getNext('label').hasClass('published')){
                new_opt.addClass('published');
            }
            if (this.selected_options.get(opt.value)){
                new_opt.addClass('selected');
            }
            popup.adopt(new_opt);
        }.bind(this));
        popup.onWindowResize();

    },

    draw_list: function(popup){
        popup.setFixedContent(new Element('label', {'for':this.field_id+'-search', 'text':'поиск', 'class':'search_label'}),
                  new Element('input', {'type':'text', 'id':this.field_id+'-search'})
                  .addEvents({
                      'keydown': this.filter_handler.bind(this),
                      'keyup': this.filter_handler.bind(this)
                      })
                  );
        this.build_selectable(popup, this.options);
    }
});

Blocks.register('popup-filtered-select', function(el){
    new PopupFilteredSelect(el, JSON.parse(el.dataset.config));
});

