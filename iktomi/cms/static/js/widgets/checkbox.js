Widgets.CheckBox = Widgets.create(Widgets.Widget, {

    render: function() {
        return (<input type="checkbox"
                       name={this.props.key}
                       defaultChecked={this.state.value.text} />);
    }
});


Widgets.CheckBoxSelect = Widgets.create(Widgets.Widget, {
    render: function() {
        var checkBoxes = this.props.options.map(function(option){
            var textValues = this.state.value.map(function(item){
                return item.text
            });
            var checked = textValues.indexOf(option.value) >= 0 ;
            return (<Widgets.CheckBox />);
        }.bind(this));
        return (<div>{checkBoxes}</div>);
    }
});
