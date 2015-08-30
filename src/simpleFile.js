//Learn to use browerify or whaterve to do a proper jQuery import
// $ - is assumed to be jQuery

class SimpleFileReader {

    constructor(container,id) { 
        var that = this;
        this.container = container
        $(container).html('<input type="file" id="' + id +'" name="file" > <div id="xx" style="background:grey;" class="content"> ');
        var x=$("#"+id,container);
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
        $('#xx',this.container).html('<div class="error abort"> The file load failed (abort)</div>')
    }
    onabort (evt) {
        $('#xx',this.container).html('<div class="error "> The file load failed (error)</div>')
    }
    onload (evt) {
        var txt =  this.reader.result;
        $('#xx',this.container).html('<div class="data">'+ this.reader.result +'</div>')
    }
}
