var PopupFilteredSelect = new Class({
    Implements: [Options, Events],

    initialize: function(field, options){//multiple, required, disable_unpublished){
        this.setOptions(options);
        this.field = $(field);
        this.field.store('widget', this);
        this.field.set('value', null);
        this.multiple = options.multiple;
        this.readonly = options.readonly;
        this.required = options.required;
        this.disableUnpublished = options.disable_unpublished;
        this.fieldId = this.field.id;
        this.values = this.field.getElement('.selected_values');
        this.listButton = $(this.fieldId+'-listbutton');

        this.options = new Array();
        this.disabledOptions = new Hash();
        this.selectedOptions = new Hash();

        this.popup = new Popup();

        this.filterBy = '';
        if (this.listButton) {
            this.listButton.addEvent('click', function(){
                this.drawList(this.popup);
                this.popup.show();
                $(this.fieldId+'-search').focus();
            }.bind(this));
        }

        this.values.getElements('input').each(function(opt){
          this.options.push({'value':opt.value,
              'title':opt.getNext('label').get('html'),
              'selected':(opt.checked)
              });
          if(opt.checked){
            this.selectedOptions.set(opt.value, opt.value);
          }
          opt.addEvent('change', function(e){
            if(!e.target.get('checked')){
              this.deselectValue(e.target.value);
            }
          }.bind(this));
          optLabel = opt.getNext('label');
          if(this.disableUnpublished && !optLabel.hasClass('published')){
            this.disabledOptions.set(opt.value, optLabel);
          }
          if (!this.readonly){
            optLabel.addEvent('click', function(e){
              e.preventDefault();
              this.drawList(this.popup);
              this.popup.show();
              $(this.fieldId+'-search').focus();
            }.bind(this));
          }

          if(!this.readonly && (this.multiple || !this.required)){
            opt.getNext('span').addEvent('click', function(e){
              this.deselectValue(e.target.getPrevious('input').value);
            }.bind(this));
          } else {
            opt.getNext('label').addClass('right_round');
            opt.getNext('span').destroy();
          }
        }.bind(this));
        if(this.selectedOptions.getLength()>0){
          this.field.value=this.selectedOptions.getValues()[this.selectedOptions.getLength()-1];
        }
    },

    selectValue: function(value){
        if (!this.multiple){
            this.selectedOptions=new Hash();
            this.values.getElements('.selected').removeClass('selected');
        }

        this.selectedOptions.set(value, value);
        var checkbox = $(this.fieldId+'-'+value);
        checkbox.set('checked', true);
        checkbox.getParent().addClass('selected');
        this.changeValue(value);
        if(!this.multiple)
        this.popup.hide();
    },

    deselectValue: function(value){
        this.selectedOptions.erase(value);
        var checkbox = $(this.fieldId+'-'+value);
        checkbox.set('checked', false);
        checkbox.getParent().removeClass('selected');
        this.changeValue(value);
    },

    deselectAll: function(){
        this.selectedOptions.each(this.deselectValue.bind(this));
    },

    changeValue: function(value){
        if(this.selectedOptions.get(value)) {
        this.field.set('value', value);
        } else {
        this.field.set('value', null);
        }
        this.field.fireEvent('value_changed', this.field);
    },

    filterHandler: function(e){
        this.filterBy = e.target.value;
        var options = this.options;
        var visibleOptions = new Hash();

        options.each(function(opt){
            var start = opt.title.toLowerCase().search(this.filterBy.toLowerCase())
            if (start >-1){
                visibleOptions.set(opt.value, {'title':opt.title, 'value':opt.value, 'start':start});
            }
        }.bind(this));
        this.buildSelectable(this.popup, visibleOptions, this.filterBy.length);

    },

    buildSelectable: function(popup, newOptions, hlLen){
        popup.contentEl.empty();
        newOptions.each(function(opt, value){
            if(hlLen) {
                var optTitle = opt.title.substring(0, opt.start)+
                                '<b>'+opt.title.substring(opt.start, opt.start+hlLen)+'</b>'+
                                opt.title.substring(opt.start+hlLen);
            } else {
                var optTitle = opt.title;
            }

            var newOpt = new Element('div', {
                'html': optTitle,
                'id':this.fieldId+'-'+opt.value+'-list',
                'class':'filter-list-value'}).addEvents({
                    'mouseenter':function(){this.addClass('hover')},
                    'mouseleave': function(){this.removeClass('hover')}
                });


            if(this.disabledOptions.get(value)==null){
                newOpt.addEvent('click', function(e){
                    var target = e.target.hasClass('filter-list-value')?
                                    e.target:
                                    e.target.getParent('.filter-list-value');
                    var id = target.id.replace('-list', '').replace(this.fieldId+'-', '');
                    if(target.hasClass('selected')){
                        this.deselectValue(id);
                        target.removeClass('selected');
                    } else {
                        if(!this.multiple){
                            popup.contentEl.getElements('.selected').removeClass('selected');
                        }
                        this.selectValue(id);
                        target.addClass('selected');
                    }
                    }.bind(this));
            } else {
                newOpt.addClass('disabled');
            }
            if($(this.fieldId+'-'+opt.value).getNext('label').hasClass('published')){
                newOpt.addClass('published');
            }
            if (this.selectedOptions.get(opt.value)){
                newOpt.addClass('selected');
            }
            popup.adopt(newOpt);
        }.bind(this));
        popup.onWindowResize();

    },

    drawList: function(popup){
        popup.setFixedContent(new Element('label', {'for':this.fieldId+'-search', 'text':'поиск', 'class':'search_label'}),
                  new Element('input', {'type':'text', 'id':this.fieldId+'-search'})
                  .addEvents({
                      'keydown': this.filterHandler.bind(this),
                      'keyup': this.filterHandler.bind(this)
                      })
                  );
        this.buildSelectable(popup, this.options);
    }
});

Blocks.register('popup-filtered-select', function(el){
    new PopupFilteredSelect(el, JSON.parse(el.dataset.config));
});

