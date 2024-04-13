# CreateCPU Documentation

## Basic Structure

CreateCPU consists of two main parts:

- Store
- Renderer

The store is a JavaScript object representing the state of the entire circuit, while the renderer subscribes to the Store to display the current circuit on the screen.
It also receives user inputs and reflects them back into the Store.

## [Store](/src/store)

In the store, various types of objects are normalized and stored in a non-nested manner.
Every object in the store has a globally unique UUID stored in the id property, which is used to uniquely identify the object.

The store is divided into a root store and separate stores defined for each type of object, with actual data stored in these individual object stores.

Each object-specific store implements [EventEmitter](https://nodejs.org/docs/latest/api/events.html#class-eventemitter), allowing the renderer to monitor changes to the store through events.
Each object-specific store must implement the following four events, with the event object passing the object that triggered the event:

- `didRegister`: Triggered when an object is registered in the store.
- `didUpdate`: Triggered when an object is updated.
- `willUnregister`: Triggered when an object is about to be unregistered from the store.
- `didUnregister`: Triggered after an object is unregistered from the store and all objects dependent on it are also unregistered. Subsequent sections will describe the roles of representative objects managed by the store.

### [Component](/src/store/component.ts)

`Component` represents a circuit that has functional significance on its own.
Components are divided into **intrinsic components**, which are predefined within CreateCPU and cannot be modified by users, and user-defined components, which are defined by the behaviors specified in Nodes described below.

### [Node](/src/store/node.ts)

`Node` represents the placement of one component within another.
It has properties `parentComponentId` indicating which component it is part of, and `componentId` indicating which component it employs.
The `parentComponentId` allows recursive searching outward, and you cannot specify a `componentId` that leads back recursively, reflecting a physical constraint that prevents creating recursive circuits.

### [Pin](/src/store/pin.ts)

`Pin` serves as an external interface for a component.
Pins are used to connect nodes using connections described later.
Each pin has a `componentId` property indicating the component it belongs to.
The `implementation` property describes how electrical signals entering and leaving the pin are processed.
This can be an **intrinsic implementation** for intrinsic components or a **user-defined implementation** for user-defined components.
User-defined implementations include properties `nodeId` and `pinId` to specify the node and pin of the connection target, respectively.
The component utilized by the node must match the component where the pin is defined.

### [Connection](/src/store/connection.ts)

`Connection` represents the wires in a circuit, containing information about the nodes and pins at the start and end points.

## Renderer

WIP
