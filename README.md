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
```oml
+num~number = 10;
+str~string = "Hello, OML!";
+flag~bool = yes;

^^num;  // Output: 10
^^str;  // Output: Hello, OML!
^^flag; // Output: yes
```

#### Conditional Statements
```oml
+num~number = 15;

? [num > 10] |
  ^^ "Number is greater than 10";
~
: |
  ^^ "Number is less than or equal to 10";
~
```

#### Loops
```oml
+counter~number = 1;
+sum~number = 0;

%[counter <= 5] |
  <-sum = sum + counter;
  <-counter = counter + 1;
~

^^sum; // Output: 15 (1 + 2 + 3 + 4 + 5)
```

