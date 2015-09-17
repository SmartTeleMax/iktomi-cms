/** @jsx React.DOM */

(function() {
    // XXX make draggable!

    var ItemRow = React.createClass({
      componentDidMount: function(){
          var widget = this.props.parent.props;
          var html = widget.row_by_value[this.props.value];
          if (html){
            this.setHtml();
          } else {
            var url = addUrlParams(widget.url, {'__item_row': this.props.value});
            new Request({
                'url': url,
                'onSuccess': function(result) {
                    widget.row_by_value[this.props.value] = result;
                    this.setHtml();
                }.bind(this)
            }).get();
          }
      },

      setHtml: function(){
          var el = this.getDOMNode();
          var html = this.props.parent.props.row_by_value[this.props.value] || '';
          var div = document.createElement('table');
          div.innerHTML = html;
          var tds = div.getElements('td');
          for (var i=tds.length; i--;){
            this.makeLinksExternal(tds[i]);
            tds[i].inject(el, 'top');
          }
          el.className = div.getElement('tr').className;
      },

      makeLinksExternal: function(el) {
        var links = el.getElements('a');
        var rel = this.props.parent.props.rel;
        if (rel === null){
          links.setProperty('target', '_blank');
        } else {
          links.setProperty('rel', rel);
        }
      },
      setMain:function(){
          this.props.parent.getMainWidget().setValue(this.props.value);
      },
      isMain: function(){
          var input_name = this.props.parent.props.main_field_name;
          var value = this.props.parent.getFormWidget().getValueByInputName(input_name);
          return this.props.value.text == value.text;
      },
      render: function(){
        var widget = this.props.parent.props;
        var parent = this.props.parent;
        var removeBtn = '';
        if(widget.allow_delete && !widget.readonly){
            removeBtn = <td>
                          <button className='button button-tiny icon-delete'
                                  onClick={parent.onDropClick}></button>
                        </td>;
        }
        var selectMainRadioButton = ''
        if(widget.allow_select_main){
            selectMainRadioButton = <td key="select_main_button"><input name={widget.input_name+'_main'} value={this.props.value.text} checked={this.isMain()} onChange={this.setMain} type="radio"></input></td>;
        }
        var sortBtns = '';
        if (widget.multiple && widget.sortable && !widget.readonly){
            sortBtns = <td className='w-control-cell'>
                         <a className='up-btn'
                            onClick={parent.onUpClick}>↑</a>
                         <a className='down-btn'
                            onClick={parent.onDownClick}>↓</a>
                       </td>;
        }

        return <tr>
                 {selectMainRadioButton}
                 <input type="hidden"
                        name={widget.input_name}
                        value={this.props.value}></input>
                 {sortBtns}
                 {removeBtn}
               </tr>;
      }
    });

    var PopupStreamSelectInternals = {
        // A lot of non-react imperative staff

        patchItemForm: function(){
          // create popup magic is here!
          var frm = this.popup.contentEl.getElement('.item-form');
          if (frm){
            frm.retrieve('ItemForm')._callback_hook = function(result, callback) {
                debugger;
              //// вызывается при успешном сохранении нового объекта
              //if (result.item_id && this._selected_items.indexOf(result.item_id) < 0) {
              //  this._select_items.push(result.item_id);
              //  // Show only created item in stream after redirection
              //  var urlWithId = this.props.url +
              //                    (this.props.url.indexOf('?') == -1? '?': '&') +
              //                    'id='+result.item_id;
              //  this.show(callback, urlWithId);
              //}
            }.bind(this);
          }
        },
        load: function(url, callback) {
            this.popup.show_loader();
            url = addUrlParams(url, {'__popup':'', '__multiple':this._multiple});
            new Request({
                'url': url,
                'onSuccess': function(result) {
                    renderPage(result, this.popup.contentEl);
                    this.onContentRecieved(result);
                    if (callback) {
                      callback();
                    }
                }.bind(this)
            }).get();
        },

        onContentRecieved: function(result) {
            this.popup.hide_loader();
            var frm = this.popup.contentEl.getElement('.item-form');
            if (!frm) {
                //var id = this._select_items.pop();
                //while(id) {
                //    var item = this.popup.el.getElement('.itemlist .item a[data-id='+id+']').getParent('.item');
                //    this.onItemClicked(item, ''+id);
                //    id = this._select_items.pop();
                //}

                this.markSelectedItems();
                this.addSelectAllButtons()
            }
            this.attachContentEvents();
            this.popup.show();

        },

        //submitItemForm: function(frm){
        //  // XXX
        //  this.popup.show_loader();
        //  var url = frm.get('action');
        //  url = add_url_params(url, {'__popup':'', '__multiple':this._multiple, '__ajax': ''});
        //  new Request.IFRAME({
        //    'url': url,
        //    'onSuccess': function(result) {
        //      this.onContentRecieved(result);
        //    }.bind(this)
        //  }).post(frm);
        //},

        onItemClicked: function(e) {
            e.preventDefault();
            e.stopPropagation();
            var target = e.target.getParent('a') || e.target;
            var id = target.dataset.id;
            if (this.props.multiple && this.hasValue(id)){
                this.remove(id);
            } else {
                var row = target.getParent('tr');
                this.add(id, row);
            }
            if (!this.props.multiple){
                this.popup.hide();
            } else {
                this.markSelectedItems();
            }
        },

        attachContentEvents: function() {
          // XXX be careful! Called multiple times on each form
          this.popup.el.getElements('.itemlist .item a[data-id]').addEvent('click', this.onItemClicked);

          // XXX
          var frm = this.popup.el.getElement('.filter-form');
          if (frm) {
            frm.retrieve('filterForm').removeEvents('load').addEvent('load', function(){
              this.attachContentEvents();
            }.bind(this));
          }
        },

        addSelectAllButtons: function(html, scripts, redirect) {
            var selectButton = new Element('a', {'href':'javascript:void(0)',
                                                 'text':'выбрать все',
                                                 'class':'button'});
            var deselectButton = new Element('a', {'href':'javascript:void(0)',
                                                 'text':'убрать выбор текущих',
                                                 'class':'button'});

            selectButton.addEvent('click', function(e) {
                this.popup.contentEl.getElements('.stream-items .item').each(function(item) {
                    var id = item.getElement('a[data-id]').dataset.id;
                    if (!this.hasValue(id)) {
                        this.add(id, item);
                    }
                }.bind(this));
            }.bind(this));

            deselectButton.addEvent('click', function(e) {
                this.popup.contentEl.getElements('.stream-items .item').each(function(item) {
                    var id = item.getElement('a[data-id]').dataset.id;
                    if (this.hasValue(id)) {
                        this.remove(id);
                    }
                }.bind(this));
            }.bind(this));

            this.popup.contentEl.adopt(selectButton, deselectButton);
        },

        markSelectedItems: function() {
            var idLinks = this.popup.el.getElements('.itemlist .item a[data-id]');
            for (var i=idLinks.length; i--;){
                var row = idLinks[i].getParent('.item');
                if (this.hasValue(idLinks[i].dataset.id)) {
                    row.addClass('selected');
                } else {
                    row.removeClass('selected');
                }
            }
        }
    }

    Widgets.PopupStreamSelect = Widgets.create(Widgets.Widget, PopupStreamSelectInternals, {
        // Reactive part of PopupStreamSelect

        componentDidMount: function(){
            var el = this.getDOMNode();
            this.popup = new Popup();
            this.popup.contentEl.addEvent('load', this.patchItemForm);
            el.store('widget', this);
        },
        getValueAsList: function(){
            if (this.props.multiple) {
                return this.state.value;
            }
            var value = this.state.value +'';
            if (value) { return [value]; }
            return [];
        },
        onDropClick: function(e){
            if (this.props.multiple){
                // XXX works only for multiple
                var index = e.target.getParent('tr').getAllPrevious('tr').length;
                var value = this.state.value;
                value.splice(index, 1);
                this.setValue(value);
            } else {
                this.setValue(null);
            }
        },
        _move: function (arr, oldIndex, newIndex) {
            if (newIndex >= arr.length) {
                var k = newIndex - arr.length;
                while ((k--) + 1) {
                    arr.push(undefined);
                }
            }
            arr.splice(newIndex, 0, arr.splice(oldIndex, 1)[0]);
        },
        onUpClick: function(e){
            var row = e.target.getParent('tr');
            var index = row.getAllPrevious('tr').length;
            if(index > 0){
                var offset1 = row.offsetTop;
                var value = this.state.value;
                this._move(value, index, index-1);
                this.setValue(value);
                scrollAfterSort(row, offset1);
            }
        },

        onDownClick: function(e){
            var row = e.target.getParent('tr');
            var index = row.getAllPrevious('tr').length;
            var value = this.state.value;
            if(index < value.length-1){
                var offset1 = row.offsetTop;
                this._move(value, index, index+1);
                this.setValue(value);
                scrollAfterSort(row, offset1);
            }
        },

        add: function(id, itemRow) {
            this.props.row_by_value[id] = itemRow.outerHTML;
            if (this.props.multiple){
                this.state.value[this.props.unshift?'unshift':'push'](id);
                this.setValue(this.state.value);
            } else {
                this.setValue(id);
            }
        },

        remove: function(id) {
            if (this.props.multiple){
                var value = this.state.value;
                for (var index=this.state.value.length; index--;){
                    if (id == this.state.value[index].text) { break; }
                }
                if (index!= -1) {
                  value.splice(index, 1);
                  this.setValue(value);
                }
            } else {
                this.setValue('');
            }
        },

        show: function() {
            this.popup.setTitle(this.props.title);
            this.load(this.props.url);
        },
        showCreateForm: function() {
            this.popup.setTitle(this.props.title);
            this.load(this.props.create_url);
        },
        getRows: function(){
            var values = this.getValueAsList();
            var rows = [];
            for (var i=0; i<values.length; i++){
              rows.push(ItemRow({parent: this,
                                 allow_select_main:this.props.allow_select_main,
                                 key: 'row-'+values[i],
                                 value: values[i]}))
            }
            return rows;
        },

        getMainWidget: function(){
             return $$('input[name="'+this.props.main_field_name+'"]')[0].retrieve('widget');
        },
        render: function() {
            var widget = this.props;
            var buttons = '';
            if(!widget.readonly){
              var selectButton = '';
              var createButton = '';
              if (widget.allow_select){
                selectButton = <a className="button"
                                  id={widget.id + '-btn'}
                                  onClick={this.show}>{widget.open_btn_text}</a>
              }
              if (widget.allow_create){
                createButton = <a className="button"
                                  id={widget.id + "-create"}
                                  onClick={this.showCreateForm}>{widget.create_btn_text}</a>
              }

              var buttons = <div className="w-buttons">{createButton} {selectButton}</div>
            }
            return <div className={"w-popup-stream-select " + (widget.classname||"")}
                        id={widget.id}>
                      <div>
                        <table className="w-popup-stream-select-items">
                          <tbody>{this.getRows()}</tbody>
                        </table>
                      </div>
                      {buttons}
                   </div>;
        }
    });

    function addUrlParams(url, params, replace_params){
      var p = '';
      for(var name in params){
        if(replace_params){
          var r = new RegExp(name + '=[^&#$]+',"gi")

          if(r.test(url)) {
            url = url.replace(r, '');
            url = url.replace(/&+/g, '&').replace(/\?&+/g, '?');
          }
          p += name + '=' + params[name] + '&';
        } else {
          if(params[name]!==false){
            p += (new RegExp(name + '=' + params[name],"i").test(url)) ?
                      '' :
                      (name + '=' + params[name] + '&');
          }
        }
      }
      p = p.replace(/&$/,'');
      return url + (/\?/.test(url) ? ('&'+p) : ('?'+p))
    }



})();

