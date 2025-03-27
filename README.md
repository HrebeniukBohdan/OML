# OML

An experiment of creating a programming language.

<a alt="Nx logo" href="https://nx.dev" target="_blank" rel="noreferrer"><img src="https://raw.githubusercontent.com/nrwl/nx/master/images/nx-logo.png" width="45"></a>

## Run examples

To run some code examples:

```sh
npx run oml
```

## Tests

To run tests

```
npx nx oml:test
```

## OML Code Examples

### 1. Basic Language Features

#### Variable Declaration and Assignment
```rs
+num~number = 10;
+str~string = "Hello, OML!";
+flag~bool = yes;

^^num;  // Output: 10
^^str;  // Output: Hello, OML!
^^flag; // Output: yes
```

#### Conditional Statements
```rs
+num~number = 15;

? [num > 10] |
  ^^ "Number is greater than 10";
~
: |
  ^^ "Number is less than or equal to 10";
~
```

#### Loops
```rs
+counter~number = 1;
+sum~number = 0;

%[counter <= 5] |
  <-sum = sum + counter;
  <-counter = counter + 1;
~

^^sum; // Output: 15 (1 + 2 + 3 + 4 + 5)
```

### 2. Functions

#### Function Declaration and Return
```rs
@add::<a~number & b~number> -> number |
  @add <- (a + b);
~

^^ <>add::(5, 3); // Output: 8
```

#### Recursive Function
```rs
@factorial::<n~number> -> number |
  ? [n <= 1] |
    @factorial <- 1;
  ~ : |
    @factorial <- n * <>factorial::(n - 1);
  ~
~

^^ <>factorial::(5); // Output: 120
```

#### Function with Conditional Logic
```rs
@checkValue::<x~number> -> string |
  ? [x > 0] |
    @checkValue <- "Positive";
  ~ : |
    @checkValue <- "Non-positive";
  ~
~

^^ <>checkValue::(5);  // Output: Positive
^^ <>checkValue::(-3); // Output: Non-positive
^^ <>checkValue::(0);  // Output: Non-positive
```

### 3. Arrays

#### Array Declaration and Initialization
```rs
+arr~array<number> = array<number>(5); // Create an array of size 5 and initialized with 0 by default
^^arr; // Output: [0, 0, 0, 0, 0]
```

#### Accessing and Modifying Array Elements
```rs
+arr~array<number> = array<number>(3); // Create an array of size 3 and initialized with 0 by default
arr->(0) = 10; // Set the first element to 10
arr->(1) = 20; // Set the second element to 20
arr->(2) = 30; // Set the third element to 30
^^arr; // Output: [10, 20, 30]
```

#### Iterating Over an Array
```rs
+arr~array<number> = array<number>(1, 2, 3, 0, 0); // Create an array of size 5 and initialized with array literal
arr->(3) = 4;
arr->(4) = 5;

+sum~number = 0;
+i~number = 0;

%[i < 5] |
    <-sum = sum + arr->(i);
    <-i = i + 1;
~

^^sum; // Output: 6 (1 + 2 + 3 + 4 + 5)
```