
class TimelineRelations {

    constructor() {

       this.events = [];
       this.date_relations = []

    }

     create_event(name,when,ended) {

        if (console.assert) {
            console.assert(this.events.length == this.date_relations.length, "Internal data inconsistent");
        }
        var loc =  this.events.length ;

        //Store the provided dates as is so they mantain any relationships.
        this.date_relations[loc] = { start:when, end: ended }


        //Convert to JS Dates for vis.
        var tend = typeof(ended);
        var edit = true;
        if ((tend != "undefined") && (tend != "Date")) {
            ended  = ended.toDate();
        }
        if (when instanceof MemoryMoment) {
            edit = false;
        }

        //Id is our array index which makes the call backs easy
        this.events[loc] = {id:loc, content:name,start:when.toDate(),end:ended, editable:edit};
        return when;
    }

    onMove (item, callback) {
        //Check Item is of the correct form.
        this.date_relations[item.id].start.set(item.start.toObject());
        //update vis timeline
        callback(item);
    }

    run(container) {
        var that = this;
        var x = new vis.DataSet(this.events);
        var timeline=new vis.Timeline(container,x,{
                editable: {
                    add: true,         // add new items by double tapping
                    updateTime: true,  // drag items horizontally
                    remove: true       // delete an item by tapping the delete button top right
               },

                onMove: function (item,callback) { that.onMove(item,callback);}
            });
        }
}
