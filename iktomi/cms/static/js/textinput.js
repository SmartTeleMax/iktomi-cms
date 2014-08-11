/** @jsx React.DOM */

window.TextInput = React.createClass({
    getInitialState: function() {
        if (this.props.data){
            var value = this.props.data;
            delete this.props.data;
        } else {
            var value = {}
        }
 
        if (this.props.initial) {
            // Value object must be mutable.
            // As I understand, this is react's method to collect
            // changes from children.
            var initial = {'text': this.props.initial};
        } else {
            var initial = {'text': ''};
        }
        var init = JSON.stringify(initial);
        initial = _mergeObjects(initial, value);
        console.log('value', init, JSON.stringify(value), JSON.stringify(initial), JSON.stringify(_mergeObjects(value, initial)));
 
        return {'value': _mergeObjects(value, initial)}
    },
    setValue: function(newValue){
        var value = _mergeObjects(this.state.value, newValue);
        this.setState({'value': value});
    },
    getValue: function(){
        return this.state.value.text;
    },
    onChange: function(e){
        this.setValue(e.target.value);
    },
    render: function() {
        return <input type="text" value={this.state.value.text} onChange={this.onChange}></input>;
    }
});


window.Textarea = React.createClass({
  // XXX DRY
    getInitialState: function() {
        if (this.props.data){
            var value = this.props.data;
            delete this.props.data;
        } else {
            var value = {}
        }
 
        if (this.props.initial) {
            // Value object must be mutable.
            // As I understand, this is react's method to collect
            // changes from children.
            var initial = {'text': this.props.initial};
        } else {
            var initial = {'text': ''};
        }
        var init = JSON.stringify(initial);
        initial = _mergeObjects(initial, value);
        console.log('value', init, JSON.stringify(value), JSON.stringify(initial), JSON.stringify(_mergeObjects(value, initial)));
 
        return {'value': _mergeObjects(value, initial)}
    },
    setValue: function(newValue){
        var value = _mergeObjects(this.state.value, newValue);
        this.setState({'value': value});
    },
    getValue: function(){
        return this.state.value.text;
    },
    onChange: function(e){
        this.setValue(e.target.value);
    },
    render: function() {
        return <textarea onChange={this.onChange}>{this.state.value.text}</textarea>;
    }
});
