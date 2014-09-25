/** @jsx React.DOM */

window.FieldList = React.createClass({
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
        this.key = this.key || -1;
        //for (var i=value.length; i--;){
        //    if(!value[i]._key){
        //      value[i]._key = (this.key--);
        //    }
        //}
 
        return {'value': value}
 
    },
    subWidget: function(data){
        var prop = _clone(this.props.subwidget);
        if(data){
            prop.data = data;
        } else {
            prop.data = {};
            this.key = this.key || -1;
            prop.data._key = this.key--;
        }
 
        return (React.DOM[prop.widget]||window[prop.widget])(prop);
    },
 
    fieldListRow: function(data){
        var subWidget = this.subWidget(data);
        return <div className="fieldlist-row" key={subWidget.props.data._key}>
                {subWidget}
                <a onClick={this.onUpClick}>↑</a>
                <a onClick={this.onDownClick}>↓</a>
                <a onClick={this.onDropClick}>x</a>
               </div>
    },
    render: function(){
        var ws = [];
        var value = this.state.value;
        for (var i=0; i<value.length; i++){
            var row = this.fieldListRow(value[i])
            ws.push(row);
        }
        this.subWidgets = ws.slice(1);
        var fields = React.DOM.div({'className': 'fieldlist'}, ws);
        var addButton = React.DOM.button({onClick: this.onAddClick}, 'Add');
        return React.DOM.div({},
                             fields, addButton)
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
        var index = e.target.getParent('.fieldlist-row').getAllPrevious('.fieldlist-row').length;
        var value = this.getValue();
        if(index < value.length-1){
            this._move(value, index, index+1);
            this.setValue(value);
            //this.fireChange();
        }
    },
    onUpClick: function(e){
        var index = e.target.getParent('.fieldlist-row').getAllPrevious('.fieldlist-row').length;
        if(index > 0){
            var value = this.getValue();
            this._move(value, index, index-1);
            this.setValue(value);
            //this.fireChange();
        }
    },
    onDropClick: function(e){
        var index = e.target.getParent('.fieldlist-row').getAllPrevious('.fieldlist-row').length;
        var value = this.getValue();
        value.splice(index, 1);
        this.setValue(value);
    },
    onAddClick: function(e){
        var value = this.getValue();
        var params = this.props.subwidget;
        var newRowValue = this.subWidget().getInitialState().value;
        value.push(newRowValue)
        this.setValue(value);
 
        //this.fireChange();
    },
    fireChange: function(){
        // XXX why doesn't this work?
        var dom = this.getDOMNode()
        var evt = document.createEvent("HTMLEvents");
        evt.initEvent("change", true, true);
        dom.dispatchEvent(evt);
    }
});


