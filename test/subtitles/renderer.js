import Squire from 'squire';
    describe('Renderer', () => {
      var Renderer;
      var squire;
      var transformerMock;

      beforeEach(done => {
        transformerMock = function () {
          return {
            transformXML: function () {
              return {
                baseStyle: '',
                subtitlesForTime: function () {}
              };
            }
          };
        };

        squire = new Squire();
        squire.mock({
          'bigscreenplayer/subtitles/transformer': transformerMock
        });
        squire.require(['bigscreenplayer/subtitles/renderer'], function (RendererWithMocks) {
          Renderer = RendererWithMocks;
          done();
        });
      });

      it('should initialise with a id, xml object, media player and autoStart value', () => {
        var mockMediaPlayer = jasmine.createSpy();
        var renderer = Renderer('subtitlesOutputId', '', mockMediaPlayer, true);

        expect(renderer).toEqual(jasmine.objectContaining({render: jasmine.any(Function), start: jasmine.any(Function), stop: jasmine.any(Function)}));
      });

      it('should set the output elements display style if autoStart is true', () => {
        var mockMediaPlayer = jasmine.createSpy();
        var renderer = Renderer('subtitlesOutputId', '', mockMediaPlayer, true);
        var outputElement = renderer.render();

        expect(outputElement.style.display).toBe('block');
      });

      it('should not set the output elements display style if autoStart is false', () => {
        var mockMediaPlayer = jasmine.createSpy();
        var renderer = Renderer('subtitlesOutputId', '', mockMediaPlayer, false);
        var outputElement = renderer.render();

        expect(outputElement.style.display).toBe('');
      });
    });
  

