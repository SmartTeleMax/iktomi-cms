Widgets.FileInput = Widgets.create(Widgets.Widget, {
    render: function() {
        return <input type="file"
                      name={this.props.input_name}  />;
    }
});


