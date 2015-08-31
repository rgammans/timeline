//Learn to use browerify or whaterve to do a proper jQuery import
// $ - is assumed to be jQuery

class SimpleFileReader {

    constructor(container,id,opts) { 
        var that = this;
        this.container = container
        this.options = opts
        $(container).html('<input type="file" id="' + id +'" name="file" > <div class="message-box" style="background:grey;" class="content"> ');
        this.input=$("#"+id,container);
        $("#"+id,container).on('change',function() { that.onchanged.apply(that,arguments) } );
    }
    onchanged(e) {
        var that = this;
        this.f = e.target.files[0];
        this.reader = new FileReader();
        this.reader.onabort = function() { that.onabort.apply(that,arguments) };
        this.reader.onerror = function() { that.onerror.apply(that,arguments) };
        this.reader.onload =  function() { that.onload.apply(that,arguments) };
        this.reader.readAsText(this.f);
        this.container.inner_html="loading...";
    }

    onabort (evt) {
        $('.message-box',this.container).html('<div class="error abort"> The file load failed (abort)</div>')
    }
    onabort (evt) {
        $('.message-box',this.container).html('<div class="error "> The file load failed (error)</div>')
    }
    onload (evt) {
        var txt =  this.reader.result;
        if ( this.options.display_content ) {
            $('.message-box',this.container).html('<div class="data">'+ txt +'</div>')
        }
        if (this.options.onload ) {
            this.options.onload(txt);
            this.input.prop('value','');
            $('.message-box',this.container).html('<div class="success">Loaded successfully</div>')
        }
    }
}
