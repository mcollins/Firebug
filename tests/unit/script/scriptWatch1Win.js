function prod(animal) {
    animal.say();
};

var duck = function() {
    this.say = function() {
        dump('quack\n');
    };
};

var cat = function() {
    this.say = function() {
        dump('meow!!\n');
    };
};
