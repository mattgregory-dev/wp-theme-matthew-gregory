#!/usr/bin/env node
/**
 * Stack-parse the block comments in a page-content working file.
 *
 * `block-audit.js` covers templates/, parts/ and patterns/ — the files in git.
 * Page content lives in the database and passes through wp/.work/ on its way
 * there, so it reaches WordPress unchecked. An unbalanced block surfaces in the
 * editor as "This block contains unexpected or invalid content", naming no file
 * and no line, which is a bad way to find out.
 *
 * Usage:  node scripts/check-page-blocks.js ../../../.work/home.html
 */

import fs from 'node:fs';

const path = process.argv[ 2 ];

if ( ! path ) {
	console.error( 'usage: node scripts/check-page-blocks.js <file>' );
	process.exit( 2 );
}

const source = fs.readFileSync( path, 'utf8' );
const TOKEN = /<!--\s*(\/?)wp:([a-z0-9-]+(?:\/[a-z0-9-]+)?)([\s\S]*?)(\/?)-->/g;

const stack = [];
const errors = [];
let match;
let count = 0;

while ( ( match = TOKEN.exec( source ) ) !== null ) {
	const [ , closing, name, , selfClosing ] = match;
	const line = source.slice( 0, match.index ).split( '\n' ).length;
	count++;

	if ( selfClosing.trim() === '/' ) {
		continue;
	}

	if ( closing ) {
		if ( ! stack.length ) {
			errors.push( `line ${ line }: closing ${ name } with nothing open` );
		} else if ( stack[ stack.length - 1 ].name !== name ) {
			const open = stack[ stack.length - 1 ];
			errors.push(
				`line ${ line }: closing ${ name } but ${ open.name } is open (line ${ open.line })`
			);
			stack.pop();
		} else {
			stack.pop();
		}
	} else {
		stack.push( { name, line } );
	}
}

stack.forEach( ( open ) => {
	errors.push( `line ${ open.line }: ${ open.name } never closed` );
} );

if ( errors.length ) {
	console.error( 'UNBALANCED:' );
	errors.forEach( ( error ) => console.error( '  ' + error ) );
	process.exit( 1 );
}

console.log( `balanced — ${ count } block tokens` );
