/** @jsx React.DOM */

Widgets.PopupFilteredSelect = Widgets.create(Widgets.Select, {
    // TODO: disableUnpublished
    //       unpublishedOptions (serverside?)
    //       readonly
    //       do not show close button for required

    showPopup: function(){
        this.drawList(this.props.popup);
        this.props.popup.show();
        this.props.popup.fixedContent.getElement('input').focus();
    },

    render: function() {
        var widget = this.props;
        widget.popup = widget.popup || new Popup();
        var values = this.getValueAsList();
        var items = [];
        for (var i=0; i<widget.options.length; i++){
          var option = widget.options[i];
          var selected = values.indexOf(option.value) != -1;
          var input = <input type="checkbox"
                             id={widget.id+'input-'+option.value}
                             name={widget.input_name}
                             checked={selected}
                             readOnly={true}
                             data-title={option.title}
                             data-published={option.published}
                             value={option.value}/>;
          var label = <label className={"tree_label" + (option.published? " published": '')}
                             onClick={this.props.readonly ? '' : this.showPopup}>
                        {option.title}
                      </label>;
          var close = this.props.readonly ? '' : <span className="remove" onClick={this.removeValue.pass(option.value)}>x</span>;
          items.push(<li className={selected?'selected':''}
                         key={'input-'+option.value}>{input}{label}{close}</li>);

        }
        var buttons = '';
        if(!this.props.readonly){
            var buttons = <div className="w-buttons" key="buttons">
                            <a className="button"
                              id={ widget.id +"-listbutton"}
                              onClick={this.showPopup}>{widget.open_btn_text}</a>
                          </div>
        }

        return <div id={widget.id}
                    className={"popup-select " + (widget.classname || "")}>
                <div> <ul className="selected_values" id="{{ widget.id }}-values">{items}</ul></div>
                    { buttons }
               </div>;
    },

    filterHandler: function(e){
        var filterBy = e.target.value;
        var visibleOptions = [];

        this.props.options.each(function(opt){
            var start = opt.title.toLowerCase().search(filterBy.toLowerCase())
            if (start >-1){
                var option = Object.merge({'start':start, 'length': filterBy.length}, opt);
                visibleOptions.push(option);
            }
        }.bind(this));
        this.buildSelectable(visibleOptions, filterBy.length);

    },

    buildSelectable: function(newOptions){
        var values = this.getValueAsList();
        this.props.popup.contentEl.empty();
        for (var i=0; i<newOptions.length; i++) {
            var opt = newOptions[i];
            var selected = values.indexOf(opt.value) != -1;
            if(opt.length) {
                var optTitle = opt.title.substring(0, opt.start) +
                                '<b>'+opt.title.substring(opt.start, opt.start+opt.length)+'</b>'+
                                opt.title.substring(opt.start+opt.length);
            } else {
                var optTitle = opt.title;
            }

            var newOpt = new Element('div', {
                'html': optTitle,
                'id': this.fieldId+'-'+opt.value+'-list',
                'class':'filter-list-value'}).addEvents({
                    'mouseenter':function(){this.addClass('hover')},
                    'mouseleave': function(){this.removeClass('hover')}
                });


            //if(this.disabledOptions.get(value)==null){
                newOpt.addEvent('click', this.onPopupOptionClick.bind(this, opt.value));
            //} else {
            //    newOpt.addClass('disabled');
            //}
            if(opt.published){
                newOpt.addClass('published');
            }
            if (selected){
                newOpt.addClass('selected');
            }
            this.props.popup.adopt(newOpt);
        }
        this.props.popup.onWindowResize();
    },

    onPopupOptionClick: function(value, e){
        var target = e.target.hasClass('filter-list-value')?
                        e.target:
                        e.target.getParent('.filter-list-value');

        this.onLabelClick(value);

        var selected = this.getValueAsList().indexOf(value) != -1;
        target.toggleClass('selected', selected);

        if(!this.props.multiple){
            this.props.popup.hide();
        }
    },

    drawList: function(){
        this.props.popup.setFixedContent(
                  new Element('input', {'type':'text',
                                        'class': 'filter-list-search',
                                        'placeholder': 'Поиск'})
                        .addEvent('input', this.filterHandler)
                  );
        this.buildSelectable(this.props.options, 0);
    }
});

//var PopupFilteredSelect = new Class({
//    Implements: [Options, Events],
//
//    initialize: function(field, options){//multiple, required, disable_unpublished){
//        this.setOptions(options);
//        this.field = $(field);
//        this.field.store('widget', this);
//        this.field.set('value', null);
//        this.multiple = options.multiple;
//        this.readonly = options.readonly;
//        this.required = options.required;
//        this.fieldId = this.field.id;
//        this.values = this.field.getElement('.selected_values');
//        this.listButton = $(this.fieldId+'-listbutton');
//
//        this.options = new Hash();
//        this.disabledOptions = new Hash();
//        this.selectedOptions = new Hash();
//
//        this.values.getElements('input').each(function(opt){
//          this.options.set(opt.value, {'value':opt.value,
//              'title':opt.getNext('label').get('html'),
//              'selected':(opt.checked)
//              });
//          if(opt.checked){
//            this.selectedOptions.set(opt.value, opt.value);
//          }
//          opt.addEvent('change', function(e){
//            if(!e.target.get('checked')){
//              this.deselectValue(e.target.value);
//            }
//          }.bind(this));
//          optLabel = opt.getNext('label');
//          if(this.disableUnpublished && !optLabel.hasClass('published')){
//            this.disabledOptions.set(opt.value, optLabel);
//          }
//          if (!this.readonly){
//            optLabel.addEvent('click', function(e){
//              e.preventDefault();
//              this.drawList(this.popup);
//              this.popup.show();
//              $(this.fieldId+'-search').focus();
//            }.bind(this));
//          }
//
//          if(!this.readonly && (this.multiple || !this.required)){
//            opt.getNext('span').addEvent('click', function(e){
//              this.deselectValue(e.target.getPrevious('input').value);
//            }.bind(this));
//          } else {
//            opt.getNext('label').addClass('right_round');
//            opt.getNext('span').destroy();
//          }
//        }.bind(this));
//        if(this.selectedOptions.getLength()>0){
//          this.field.value=this.selectedOptions.getValues()[this.selectedOptions.getLength()-1];
//        }
//    },
//
//
//
//
//});
//
//Blocks.register('popup-filtered-select', function(el){
//    new PopupFilteredSelect(el, JSON.parse(el.dataset.config));
//});

