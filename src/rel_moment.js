//Note this is in ES6 Syntax - probaly need to do ES6 export stuff too

class MemoryMoment {
      constructor(initVal) {

            this.base = initVal
            this._ops = []
        }

    _append_op(op) {
        this._ops.push(op);
    }

    move_back(amt,units) {
        this._append_op({'op':'subtract','amt':amt,'units':units});
    }

    move_forward(amt,units) {
        this._append_op({'op':'add','amt':amt,'units':units});
    }

    subtract(amt,units) {
        //Buid a new values based on tjis
        var rv = new MemoryMoment(this);
        rv._append_op({'op':'subract','amt':amt,'units':units});
        return rv;
    }
    add(amt,units) {
        //Buid a new values based on tjis
        var rv = new MemoryMoment(this);
        rv._append_op({'op':'add','amt':amt,'units':units});
        return rv;
    }

    toMoment() {
        var rv = this.initVal;
        if (rv instanceof MemoryMoment) {
            rv = rv.toMoment();
        }
        for (var op of this._ops) {

            if (op.op == "add") {
                rv.add(op.amt,op.units)
            }else if (op.op == "subtract") {
                rv.subtract(op.amt,op.units)
            }
        }

        return rv
    }


}
