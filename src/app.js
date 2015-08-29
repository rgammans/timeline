
class TimelineRelations {

    constructor() {

       this.events = [];
       this.date_relations = [];
       this.timeline = null;
    }

     create_event(name,when,ended) {

        if (console.assert) {
            console.assert(this.events.length == this.date_relations.length, "Internal data inconsistent");
        }
        var loc =  this.events.length ;

        //Store the provided dates as is so they mantain any relationships.
        this.date_relations[loc] = { start:when, end: ended }
        var dates = this.dateProcessor(when,ended);
       //Id is our array index which makes the call backs easy
        this.events[loc] = {id:loc, content:name,start:dates.start,end:dates.end, editable:dates.editable};
        return when;
    }

    dateProcessor(when,ended) {

        //Convert to JS Dates for vis.
        var tend = typeof(ended);
        var edit = true;
        if ((tend != "undefined") && (tend != "Date")) {
            ended  = ended.toDate();
        }
        if (when instanceof MemoryMoment) {
            edit = false;
        }

        return { start:when.toDate(),end:ended, editable:edit};
    }

    //This handle the face we get different Date types back from Vis.
    _update_start (start,new_value) {
        if (moment.isMoment(new_value)) {
            start.set(new_value.toObject());
        } else {
            start.set(moment(new_value).toObject());
        }
    }

    onMove (item, callback) {
        //Check Item is of the correct form.
        this._update_start(this.date_relations[item.id].start,item.start);
        //update vis timeline
        callback(item);
        this.updateTimeline()
    }



    updateTimeline() {

        if (this.timeline) {
            for(var i = 0; i < this.events.length; i++) {
                var date = this.dateProcessor(this.date_relations[i].start,this.date_relations[i].end);
                this.events[i].start = date.start;
                this.events[i].end = date.end;
                this.dataset.update(this.events[i]);

            }
        }

    }

    run(container) {
        var that = this;
        this.dataset = new vis.DataSet(this.events);
        this.timeline=new vis.Timeline(container,this.dataset,{
                snap: null,
                editable: {
                    add: true,         // add new items by double tapping
                    updateTime: true,  // drag items horizontally
                    remove: true       // delete an item by tapping the delete button top right
               },

                onMove: function (item,callback) { that.onMove(item,callback);}
            });
        }
}
