/** @jsx React.DOM */

Widgets.FieldList = Widgets.FieldListWidget = Widgets.create({
    getDefault: function(){
        // called with no context (no `this`) before object creation
        return [];
    },
    getInitialState: function() {
        var value;
        if (this.props.data){
            value =this.props.data;
            delete this.props.data;
        } else if (this.props.initial) {
            value = this.props.initial;
        } else {
            value = [];
        }
        //this.key = this.key || 1;
        //for (var i=value.length; i--;){
        //    if(!value[i]._key){
        //      value[i]._key = (this.key--);
        //    }
        //}
 
        return {'value': value,
                'errors': this.props.errors};
 
    },
    subWidget: function(data){
        var prop = _clone(this.props.subwidget);
        if(data._key == undefined){
            data._key = this.state.value.length + 1;
        }
        prop._key = data._key;
        prop.parent = this;
        prop.id = this.props.id + '.' + data._key;
        prop.input_name = this.props.input_name + '.'  + data._key;

        if(!this.props.readonly){
            var errors = this.props.errors;
            prop.errors = errors[data._key] = errors[data._key] || {'.': new MutableString('')};
        }
        prop.data = data[data._key];
 
        if(!(React.DOM[prop.widget]||Widgets[prop.widget])){
            throw "Component does not exist: " + prop.widget;
        }
        return React.createElement(React.DOM[prop.widget]||Widgets[prop.widget], prop);
    },
 
    fieldListRow: function(data){
        var subWidget = this.subWidget(data);
        var orderButtons = '', deleteButton = '', errorMsg = '';
        if(!this.props.readonly){
            var widgetErrors = this.state.errors[data._key];
            var errorMsg = widgetErrors && widgetErrors['.'] && widgetErrors['.'].text
        }
        var error = (errorMsg? 
                        <div className="error" key="error">{errorMsg}</div> :
                        '');

        if (!this.props.readonly){
            deleteButton = <td className="fieldlist-delete fieldlist-btns">
                              <button className="button button-tiny icon-delete"
                                      type="button"
                                      onClick={this.onDropClick}/>
                           </td>;
        }
        if (this.props.sortable && !this.props.readonly){
            orderButtons = <td className="fieldlist-order fieldlist-btns">
                              <button className="sort sort-up"
                                      type="button"
                                      onClick={this.onUpClick}>↑</button>
                              <button className="sort sort-down"
                                      type="button"
                                      onClick={this.onDownClick}>↓</button>
                          </td>;
        }

        return <tr className="fieldlist-item" key={subWidget.props._key}>
                  <td className="fieldlist-cell">
                      {error}
                      {subWidget}
                  </td>
                  {orderButtons}
                  {deleteButton}
               </tr>
    },
    render: function(){
        var ws = [];
        var value = this.state.value;
        for (var i=0; i<value.length; i++){
            var row = this.fieldListRow(value[i])
            ws.push(row);
        }
        this.subWidgets = ws.slice(1);
        var fields = ws;
        var addButton = <button className="button w-button"
                                type="button"
                                onClick={this.onAddClick}>Добавить</button>;
        addButton = this.props.readonly? '' : addButton;
        return <div>
                  <table className={"fieldlist "+(this.props.className || '')}
                         id={this.props.id}><tbody>{fields}</tbody></table>
                  {addButton}
               </div>
    },
    setValue: function(newValue){
        var value = _mergeObjects(this.state.value, newValue);
        this.setState({'value': value});
    },
    getValue: function(){
        return this.state.value;
    },
    _move: function (arr, oldIndex, newIndex) {
        if (newIndex >= arr.length) {
            var k = newIndex - arr.length;
            while ((k--) + 1) {
                this.push(undefined);
            }
        }
        arr.splice(newIndex, 0, arr.splice(oldIndex, 1)[0]);
    },
    onDownClick: function(e){
        var index = e.target.getParent('.fieldlist-item').getAllPrevious('.fieldlist-item').length;
        var value = this.getValue();
        if(index < value.length-1){
            this._move(value, index, index+1);
            this.setValue(value);
            //this.fireChange();
        }
    },
    onUpClick: function(e){
        var index = e.target.getParent('.fieldlist-item').getAllPrevious('.fieldlist-item').length;
        if(index > 0){
            var value = this.getValue();
            this._move(value, index, index-1);
            this.setValue(value);
            //this.fireChange();
        }
    },
    onDropClick: function(e){
        var index = e.target.getParent('.fieldlist-item').getAllPrevious('.fieldlist-item').length;
        var value = this.getValue();
        value.splice(index, 1);
        this.setValue(value);
    },
    onAddClick: function(e){
        var value = this.getValue();
        var newWidgetState = Widgets.getDefaultValue(this.props.subwidget);
        var newValue = {};
        newValue[String(value.length+1)] = newWidgetState;
        newValue['_key'] = String(value.length+1);
        value.push(newValue);
        this.setValue(value);
    },
    fireChange: function(){
        // XXX why doesn't this work?
        var dom = this.getDOMNode()
        var evt = document.createEvent("HTMLEvents");
        evt.initEvent("change", true, true);
        dom.dispatchEvent(evt);
    }
});


